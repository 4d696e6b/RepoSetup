"""Drive the installed CLI through a real POSIX pseudo-terminal for acceptance tests."""

import errno
import json
import os
import pty
import select
import signal
import sys
import time


def main() -> None:
    alias, mode, answer = sys.argv[1:]
    if alias not in ("rsetup", "reposetup") or mode not in ("create", "add") or answer not in ("y", "n"):
        raise ValueError("Unsupported qualification input")
    if not os.environ.get("REPOSETUP_TEST_INPUT"):
        raise ValueError("Missing bounded selection token")

    child, terminal = pty.fork()
    if child == 0:
        os.environ["TERM"] = "dumb"
        command = 'exec ' + alias + ' ' + mode + ' --selection "$REPOSETUP_TEST_INPUT"'
        os.execl("/bin/sh", "sh", "-c", command)

    chunks: list[bytes] = []
    answered = False
    child_status = None
    deadline = time.monotonic() + 150
    try:
        while time.monotonic() < deadline:
            ready, _, _ = select.select([terminal], [], [], 0.5)
            if not ready:
                observed = os.waitpid(child, os.WNOHANG)
                if observed[0] != 0:
                    child_status = observed[1]
                    break
                continue
            try:
                chunk = os.read(terminal, 65536)
            except OSError as error:
                if error.errno == errno.EIO:
                    break
                raise
            if not chunk:
                break
            chunks.append(chunk)
            if sum(len(part) for part in chunks) > 2_000_000:
                raise RuntimeError("Terminal transcript exceeded the test bound")
            transcript = b"".join(chunks)
            if not answered and b"Proceed with installation?" in transcript:
                if ("Decoded selection (" + mode + ",").encode() not in transcript or b"Operations" not in transcript:
                    raise RuntimeError("Prompt appeared before choices and plan")
                os.write(terminal, answer.encode("ascii") + b"\n")
                answered = True
        else:
            raise TimeoutError("Terminal prompt or command did not finish")
    except BaseException:
        if child_status is None:
            try:
                os.killpg(child, signal.SIGTERM)
            except ProcessLookupError:
                pass
            os.waitpid(child, 0)
        raise
    finally:
        os.close(terminal)

    if child_status is None:
        child_status = os.waitpid(child, 0)[1]
    text = b"".join(chunks).decode("utf-8", errors="replace")
    print(
        json.dumps(
            {
                "childExitCode": os.waitstatus_to_exitcode(child_status),
                "reviewed": "Decoded selection (" + mode + "," in text and "Operations" in text,
                "prompted": answered,
                "transcript": text,
            }
        )
    )


if __name__ == "__main__":
    main()
