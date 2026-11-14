const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync(`${__dirname}/../static/sharing.js`, "utf8");

function createSharing(clipboard) {
  const document = {
    createElement(tagName) {
      return {
        tagName,
        children: [],
        attributes: {},
        listeners: {},
        appendChild(child) {
          this.children.push(child);
          child.remove = () => {
            this.children = this.children.filter((item) => item !== child);
          };
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        focus() { this.focused = true; },
        select() { this.selected = true; },
      };
    },
  };
  const errors = [];
  const context = vm.createContext({
    document,
    navigator: { clipboard },
    window: {
      location: new URL("https://school.example/static/index.html?email=private#old"),
    },
    URL,
    URLSearchParams,
    console: { error: (...args) => errors.push(args) },
  });
  vm.runInContext(source, context);
  const name = "Art & Music / #1 + 100%";
  const controls = context.createActivitySharing(name);
  return {
    controls,
    errors,
    button: controls.children.find((child) => child.tagName === "button"),
    status: controls.children.find((child) => child.attributes.role === "status"),
    url: `https://school.example/static/index.html#activity-${encodeURIComponent(name)}`,
  };
}

test("social destinations encode the activity link without page queries or old fragments", () => {
  const { controls, url } = createSharing();
  const links = controls.children.filter((child) => child.tagName === "a");
  assert.equal(links.length, 3);
  for (const link of links) {
    const destination = new URL(link.href);
    const sharedUrl = destination.searchParams.get("url") ||
      destination.searchParams.get("u");
    if (link.textContent === "WhatsApp") {
      assert.equal(destination.searchParams.get("text"),
        `Check out Art & Music / #1 + 100% at Mergington High School! ${url}`);
    } else {
      assert.equal(sharedUrl, url);
    }
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.ok(!link.href.includes("private"));
  }
});

test("copy link reports success after writing the activity URL", async () => {
  let copied;
  const { button, status, url } = createSharing({
    writeText: async (value) => { copied = value; },
  });
  await button.listeners.click();
  assert.equal(copied, url);
  assert.equal(status.textContent, "Link copied!");
});

test("unavailable clipboard offers a selected manual link without duplicates", async () => {
  const { controls, button, status, url } = createSharing();
  await button.listeners.click();
  await button.listeners.click();
  const inputs = controls.children.filter((child) => child.tagName === "input");
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].value, url);
  assert.ok(inputs[0].readOnly && inputs[0].focused && inputs[0].selected);
  assert.match(status.textContent, /Copy the link below/);
});

test("denied clipboard permission offers manual copying and can recover", async () => {
  const clipboard = { writeText: async () => { throw new Error("Permission denied"); } };
  const { controls, button, status, errors } = createSharing(clipboard);
  await button.listeners.click();
  assert.equal(errors.length, 1);
  assert.match(status.textContent, /Copy the link below/);
  assert.ok(controls.children.some((child) => child.tagName === "input"));
  clipboard.writeText = async () => {};
  await button.listeners.click();
  assert.equal(status.textContent, "Link copied!");
  assert.ok(!controls.children.some((child) => child.tagName === "input"));
});
