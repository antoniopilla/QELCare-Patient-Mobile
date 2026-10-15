/** Read-only audit: compare clinic contracts with the app before the UI port. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
const traverse = babelTraverse.default;
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const ast = text => parse(text, { sourceType: "module", plugins: ["jsx"] });
const ignored = new Set(["start", "end", "loc", "extra", "leadingComments", "trailingComments", "innerComments", "comments", "tokens"]);
const clean = value => Array.isArray(value) ? value.map(clean) : value && typeof value === "object"
  ? Object.fromEntries(Object.entries(value).filter(([key]) => !ignored.has(key)).map(([key, item]) => [key, clean(item)])) : value;
const sorted = values => values.map(value => JSON.stringify(clean(value))).sort();
const calls = (tree, names) => {
  const found = [];
  traverse(tree, { CallExpression({ node }) { if (node.callee.type === "Identifier" && names.includes(node.callee.name)) found.push(node); } });
  return sorted(found);
};
const files = [
  "Login/LoginScreen.js", "Register/RegisterScreen.js", "ForgotPassword/ForgotPassScreen.js", "Verifications/EmailVerification.js",
  "UserSide/UserScreen.js", "UserSide/UserBooking.js", "UserSide/PatientAppointments.js", "UserSide/MedicalRecords.js",
  "UserSide/HealthRecords.js", "UserSide/ProfileScreen.js", "Layout/MainLayout.js", "Layout/NotificationBell.js", "common/Pagination.js",
];
let requests = 0;
for (const name of files) {
  const file = `src/components/${name}`;
  const before = ast(git("show", `HEAD:${file}`));
  const after = ast(await readFile(file, "utf8"));
  const previousRequests = calls(before, ["authFetch", "fetch", "callVision"]);
  assert.deepEqual(calls(after, ["authFetch", "fetch", "callVision"]), previousRequests, `${file}: clinic request/payload changed`);
  requests += previousRequests.length;
  if (/^(Login|Register|ForgotPassword|Verifications)\//.test(name) || name === "UserSide/ProfileScreen.js") {
    assert.deepEqual(calls(after, ["useState", "useEffect", "useCallback"]), calls(before, ["useState", "useEffect", "useCallback"]), `${file}: account state/effect changed`);
    const controlProps = new Set(["type", "name", "id", "value", "defaultValue", "checked", "defaultChecked", "disabled", "readOnly", "required", "min", "max", "step", "minLength", "maxLength", "pattern", "autoComplete", "inputMode", "multiple", "accept", "ref"]);
    const controls = tree => {
      const found = [];
      traverse(tree, { JSXOpeningElement({ node }) {
        if (!["input", "select", "textarea", "form", "button"].includes(node.name.name)) return;
        const attributes = node.attributes.filter(attr => attr.type === "JSXSpreadAttribute" || controlProps.has(attr.name?.name) || /^on[A-Z]/.test(attr.name?.name || ""));
        found.push({ tag: node.name, attributes: attributes.map(clean).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });
      } });
      return sorted(found);
    };
    assert.deepEqual(controls(after), controls(before), `${file}: account form/validation control changed`);
  }
}
for (const file of ["src/App.js", "src/utils/auth.js", "src/utils/push.js", "src/utils/roleAccess.js", "src/utils/manilaDate.js", "src/components/Auth/PatientIdleTimeout.js"]) {
  assert.deepEqual(clean(ast(await readFile(file, "utf8"))), clean(ast(git("show", `HEAD:${file}`))), `${file}: protected behavior changed`);
}
const manifest = await readFile("android/app/src/main/AndroidManifest.xml", "utf8");
const oldManifest = git("show", "HEAD:android/app/src/main/AndroidManifest.xml");
assert.deepEqual(manifest.match(/<uses-permission\b[^>]*>/g), oldManifest.match(/<uses-permission\b[^>]*>/g), "Android permissions changed");
assert.equal(git("diff", "--name-only", "--", "backend-patient-mobile-patch").trim(), "", "Backend files changed");
console.log(`PASS: ${requests} clinic requests/payloads, account controls/state, routes, guards, auth, push, dates, Android permissions and backend preserved.`);
