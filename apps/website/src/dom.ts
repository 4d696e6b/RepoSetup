export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function link(text: string, href: string, className?: string) {
  const node = el("a", text, className);
  node.href = href;
  if (href.startsWith("https://")) node.rel = "noreferrer";
  return node;
}
export const asset = (name: string) => `${import.meta.env.BASE_URL}brand/${name}`;
export function artwork(name: string, alt = "", className = "") {
  const img = el("img", undefined, className);
  img.src = asset(name);
  img.alt = alt;
  img.decoding = "async";
  const dimensions = name.startsWith("feature-")
    ? [1254, 1254]
    : name === "reposetup-logo.png" || name === "setup-flow.png"
      ? [2172, 724]
      : name === "section-background.png"
        ? [1672, 941]
        : [1536, 1024];
  [img.width, img.height] = dimensions as [number, number];
  return img;
}
export function eyebrow(text: string) {
  return el("p", text, "eyebrow");
}
export function tag(text: string, style = "") {
  return el("span", text, `tag ${style}`);
}
export function codeBlock(code: string, label = "Copy command") {
  const wrap = el("div", undefined, "code-block");
  const pre = el("pre");
  pre.tabIndex = 0;
  pre.append(el("code", code));
  const button = el("button", "Copy", "copy-button");
  button.type = "button";
  button.setAttribute("aria-label", label);
  const status = el("span", "", "copy-status");
  status.setAttribute("role", "status");
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      status.textContent = "Copied";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(pre);
      selection?.removeAllRanges();
      selection?.addRange(range);
      pre.focus();
      status.textContent = "Selected. Copy with your keyboard.";
    }
  });
  wrap.append(pre, button, status);
  return wrap;
}
export function pageIntro(label: string, title: string, description: string) {
  const header = el("div", undefined, "page-intro");
  header.append(eyebrow(label), el("h1", title), el("p", description, "lede"));
  return header;
}
