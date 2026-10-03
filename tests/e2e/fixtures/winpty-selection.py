"""Drive the installed CLI through a real Windows pseudo-console."""

import json
import os
import select
import sys
import time

from winpty import PtyProcess


def main() -> None:
    alias, mode, answer = sys.argv[1:]
    if alias not in ("rsetup", "reposetup") or mode not in ("create", "add") or answer not in ("y", "n"):
        raise ValueError("Unsupported qualification input")
    token = os.environ.get("REPOSETUP_TEST_INPUT")
    if not token:
        raise ValueError("Missing bounded selection token")

    command = alias + " " + mode + " --selection %REPOSETUP_TEST_INPUT%"
    child = PtyProcess.spawn(
        [os.environ.get("ComSpec", "cmd.exe"), "/d", "/c", command],
        cwd=os.getcwd(),
        env=os.environ.copy(),
        dimensions=(40, 160),
    )
    chunks: list[str] = []
    answered = False
    deadline = time.monotonic() + 150
    try:
        while time.monotonic() < deadline:
            ready, _, _ = select.select([child.fileno()], [], [], 0.5)
            if ready:
                try:
                    chunk = child.read(65536)
                except EOFError:
                    break
                chunks.append(chunk)
                transcript = "".join(chunks)
                if len(transcript.encode("utf-8")) > 2_000_000:
                    raise RuntimeError("Terminal transcript exceeded the test bound")
                if not answered and "Proceed with installation?" in transcript:
                    if "Decoded selection (" + mode + "," not in transcript or "Operations" not in transcript:
                        raise RuntimeError("Prompt appeared before choices and plan")
                    child.write(answer + "\r")
                    answered = True
            elif not child.isalive():
                break
        else:
            raise TimeoutError("Terminal prompt or command did not finish")
        exit_code = child.wait()
    finally:
        if child.isalive():
            child.terminate(force=True)
        child.close()

    transcript = "".join(chunks)
    print(
        json.dumps(
            {
                "childExitCode": exit_code,
                "reviewed": "Decoded selection (" + mode + "," in transcript and "Operations" in transcript,
                "prompted": answered,
                "transcript": transcript,
            }
        )
    )


if __name__ == "__main__":
    main()
