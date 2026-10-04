export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function link(text: string, href: string, className?: string) {
  const node = el("a", text, className);
  node.href = href;
  return node;
}
export function section(title: string, text?: string) {
  const node = el("section");
  node.append(el("h2", title));
  if (text) node.append(el("p", text));
  return node;
}
export function list(items: string[]) {
  const node = el("ul");
  for (const item of items) node.append(el("li", item));
  return node;
}
export function field(text: string, input: HTMLInputElement | HTMLSelectElement, help?: string) {
  const wrap = el("div", undefined, "field");
  const label = el("label", text);
  label.htmlFor = input.id;
  wrap.append(label, input);
  if (help) {
    const note = el("p", help, "hint");
    note.id = `${input.id}-help`;
    input.setAttribute("aria-describedby", note.id);
    wrap.append(note);
  }
  return wrap;
}
export function select(id: string, items: { value: string; label: string }[]) {
  const node = el("select");
  node.id = id;
  for (const item of items) {
    const option = el("option", item.label);
    option.value = item.value;
    node.append(option);
  }
  return node;
}
