# oxc-defaults

Shared oxlint and oxfmt settings for TypeScript projects, with a bad and a good example for every lint rule.

## Presets

| Preset | For | Adds |
| --- | --- | --- |
| `base.json` | Every TypeScript project | The base rules, the `paragraphs/*` whitespace plugin and the `comments/adr-only` plugin |
| `react.json` | React projects, on top of `base.json` | Hooks, list keys and accessibility rules, plus the `react` and `jsx-a11y` correctness rules |
| `strict.json` | Opt-in, on top of `base.json` | Named exports only, no barrel files, kebab-case file names |

A project lists the presets it needs in `extends` and puts its own rules on top. oxlint merges `extends` first to last, and the project's own `rules` win over all of them.

## Use them in a project

Pin a release tag, so a change here never lands in your project unannounced. Pick one from the [releases](https://github.com/twankruiswijk/oxc-defaults/tags), and download the presets into an `oxc/` folder:

```sh
V=v1.0.0
BASE_URL=https://raw.githubusercontent.com/twankruiswijk/oxc-defaults/$V
curl -fsSL --create-dirs -o oxc/base.json $BASE_URL/base.json
curl -fsSL --create-dirs -o oxc/plugins/paragraphs.ts $BASE_URL/plugins/paragraphs.ts
curl -fsSL --create-dirs -o oxc/plugins/comments.ts $BASE_URL/plugins/comments.ts
curl -fsSLO $BASE_URL/.oxfmtrc.json
```

### TypeScript app

`.oxlintrc.json` in the project root:

```json
{
  "extends": ["./oxc/base.json"],
  "rules": {}
}
```

### React app

Also download the React layer:

```sh
curl -fsSL --create-dirs -o oxc/react.json $BASE_URL/react.json
```

and extend both, base first:

```json
{
  "extends": ["./oxc/base.json", "./oxc/react.json"],
  "rules": {}
}
```

For the strict layer, download `strict.json` the same way and add `"./oxc/strict.json"` to `extends`.

### Tools and scripts

```sh
pnpm add -D oxlint oxlint-tsgolint oxfmt
```

Add the scripts, replacing `src` with your source folder:

```json
"lint": "oxlint --type-aware --deny-warnings src",
"fmt": "oxfmt src",
"fmt:check": "oxfmt --check src"
```

To upgrade, change `V` and run the downloads again.

## Gotchas

- `--type-aware` needs `oxlint-tsgolint`. Without it, `no-unnecessary-condition` and `no-unsafe-type-assertion` do not run. Pass it on the command line: oxlint only reads `options.typeAware` from the root config, never from a preset in `extends`.
- `base.json` sets oxlint's built-in correctness checks to errors, so they fail the run even without `--deny-warnings`. Keep the flag anyway: it also fails the run on warnings from any rule you add as `"warn"`.
- Paths inside a preset resolve from the preset's own folder. `jsPlugins` in `base.json` says `./plugins/paragraphs.ts`, so with `base.json` in `oxc/` the plugin lives in `oxc/plugins/`. The fixtures prove this.
- A preset's `plugins` adds to the plugins of the presets before it; the fixtures prove `react.json` keeps base's `typescript` rules and `paragraphs/*` plugin. `react.json` still lists the full set, so it stays correct if oxlint ever switches to replacing. In your own `.oxlintrc.json`, leave `plugins` out unless you need another plugin, and then list them all: at the root, `plugins` replaces oxlint's default plugin list.
- In `*.test.*` and `*.spec.*` files (`.ts` and `.tsx`), `max-lines-per-function` and `max-lines` are off, because a `describe` block and a test file are often longer than these limits.
- The `paragraphs/*` rules come from `plugins/paragraphs.ts`, an oxlint JS plugin. oxlint has no built-in rule for blank lines between statements, and oxfmt keeps the blank lines you write but never adds one. The plugin runs on Node 22.18 or newer, since it is TypeScript. JS plugins are still alpha in oxlint, so pin the oxlint version. `oxlint --fix` adds every missing blank line these rules report.
- `comments/adr-only` comes from `plugins/comments.ts`, the same kind of JS plugin. oxlint's own comment rules can ban inline or TODO comments, but none can allow only comments that match a pattern.
- The plugins only import types from `@oxlint/plugins`. If your `tsconfig.json` type-checks `oxc/plugins/`, add `@oxlint/plugins` as a dev dependency or exclude the folder.
- The `$schema` line in each preset points at `./node_modules/...`, which does not exist next to `oxc/`. oxlint ignores it; only editor completion in those files is lost.

## Formatting

- `printWidth: 140`: lines wrap after 140 characters.
- `singleQuote: true`: strings use single quotes, so `const greeting = "hello";` becomes `const greeting = 'hello';`.
- oxfmt keeps a single blank line where you put one and collapses several into one. Where blank lines are required is up to the `paragraphs/*` lint rules below.

## Changing a rule

1. Change the rule in the preset it belongs to: `base.json`, `react.json` or `strict.json`. A rule is set in one preset only.
2. Add or update its folder `rules/<plugin>/<rule>/`. `rule.json` holds the group, summary and why. `bad.ts` and `good.ts` hold the examples (`bad.tsx` and `good.tsx` for React rules); use `bad/` and `good/` folders when an example needs several files.
3. Run `pnpm readme` to regenerate the rule list below, then `pnpm check` and `pnpm fixtures`.

`pnpm check` lints each example with the preset that sets its rule, on top of `base.json`. It fails when a bad example is not flagged, a good example is flagged by any rule, a rule has no folder, or this README is out of date. A rule can set `"checkOptions"` in `rule.json` to lower its limits during the check only, so a short example can still prove the rule fires. The size limits use this.

`pnpm fixtures` copies the presets into `oxc/` inside each project in `fixtures/`, the way the recipes above do, lints it and compares the result with its `expected.json`. `fixtures/ts-app` extends `base.json`; `fixtures/react-app` extends `base.json` and `react.json`. CI runs both scripts on every push and pull request.

## Lint rules

Every rule below is an error. On top of these, oxlint runs the built-in correctness checks of every plugin a preset lists, also as errors.

<!-- rules:start -->

## Base rules

Set in `base.json`, for every TypeScript project.

### Imports

#### `import/no-cycle`

No circular imports between modules.

**Why:** Cycles make load order matter, so an import can still be `undefined` when it is first used, and they tie two modules together so neither can change on its own.

Move what both files need into a third module.

Bad:

```ts
// invoices.ts
import { orderTotal } from './orders';

export const formatPrice = (cents: number): string => `EUR ${cents / 100}`;
export const invoiceLine = (cents: number): string => `Total: ${orderTotal(cents)}`;

// orders.ts
import { formatPrice } from './invoices';

export const orderTotal = (cents: number): string => formatPrice(cents);
```

Good:

```ts
// invoices.ts
import { orderTotal } from './orders';

export const invoiceLine = (cents: number): string => `Total: ${orderTotal(cents)}`;

// money.ts
export const formatPrice = (cents: number): string => `EUR ${cents / 100}`;

// orders.ts
import { formatPrice } from './money';

export const orderTotal = (cents: number): string => formatPrice(cents);
```

#### `typescript/consistent-type-imports`

A name used only as a type is imported with `type`, inline in the import list.

**Why:** Type-only imports are erased at build time, so a bundler never loads a module just for its types, and the reader sees at a glance which imports exist at runtime.

Bad:

```ts
import { EventEmitter } from 'node:events';

export function listenerTotal(emitter: EventEmitter): number {
  return emitter.eventNames().length;
}
```

Good:

```ts
import { type EventEmitter } from 'node:events';

export function listenerTotal(emitter: EventEmitter): number {
  return emitter.eventNames().length;
}
```

### Types

#### `typescript/no-explicit-any`

No `any` type.

**Why:** `any` switches off type checking for everything it touches, so mistakes only show up at runtime.

Bad:

```ts
export function userId(user: any): string {
  return user.id;
}
```

Good:

```ts
interface User {
  id: string;
}

export function userId(user: User): string {
  return user.id;
}
```

#### `typescript/no-unnecessary-condition`

No checks the types already prove always true or always false. Needs `--type-aware`.

**Why:** A check that can never fail is dead code, and it often means the types or the logic are wrong.

Bad:

```ts
export function itemCount(items: string[]): number {
  return items?.length ?? 0;
}
```

Good:

```ts
export function itemCount(items: string[]): number {
  return items.length;
}
```

#### `typescript/no-unsafe-type-assertion`

No `as` casts that claim a narrower type than the value has. Needs `--type-aware`.

**Why:** A cast tells the compiler to trust you without checking. If the value has another shape, the code breaks later, far from the cast.

Check the shape with a type guard instead of asserting it.

Bad:

```ts
interface User {
  name: string;
}

export function toUser(value: unknown): User {
  return value as User;
}
```

Good:

```ts
interface User {
  name: string;
}

function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string';
}

export function toUser(value: unknown): User {
  if (!isUser(value)) {
    throw new Error('Not a user');
  }
  return value;
}
```

#### `typescript/no-non-null-assertion`

No `!` to claim a value is not `null` or `undefined`.

**Why:** `!` is a cast that skips the check, like `as`. If the value is missing, the code fails later with a vague `cannot read properties of undefined`.

Check for the missing value and handle it, as the good version does.

Bad:

```ts
interface User {
  email: string;
}

export function ownerEmail(users: Map<string, User>, id: string): string {
  return users.get(id)!.email;
}
```

Good:

```ts
interface User {
  email: string;
}

export function ownerEmail(users: Map<string, User>, id: string): string {
  const user = users.get(id);
  if (user === undefined) {
    throw new Error(`No user ${id}`);
  }
  return user.email;
}
```

#### `typescript/no-floating-promises`

No promises that are neither awaited nor handled. Needs `--type-aware`.

**Why:** A promise nobody waits for runs in the background: the code after it runs too early, and when it fails, the error is lost.

When fire-and-forget is the intent, write `void persist(draft)` so it is visible.

Bad:

```ts
declare function persist(draft: Draft): Promise<void>;

export async function saveDraft(draft: Draft): Promise<void> {
  persist(draft);
  showToast('Saved');
}
```

Good:

```ts
declare function persist(draft: Draft): Promise<void>;

export async function saveDraft(draft: Draft): Promise<void> {
  await persist(draft);
  showToast('Saved');
}
```

#### `typescript/switch-exhaustiveness-check`

A `switch` over a union handles every member. Needs `--type-aware`.

**Why:** When someone adds a member to the union, every `switch` that forgets it is flagged, instead of silently falling through at runtime.

Bad:

```ts
type Status = 'draft' | 'review' | 'published';

export function statusLabel(status: Status): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'review':
      return 'In review';
  }
}
```

Good:

```ts
type Status = 'draft' | 'review' | 'published';

export function statusLabel(status: Status): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'review':
      return 'In review';
    case 'published':
      return 'Published';
  }
}
```

### Control flow

#### `eslint/no-else-return`

No `else` after an `if` block that returns.

**Why:** The `else` adds a level of nesting without adding meaning: the code after the `if` only runs when it did not return.

Bad:

```ts
export function label(count: number): string {
  if (count === 0) {
    return 'empty';
  } else {
    return `${count} items`;
  }
}
```

Good:

```ts
export function label(count: number): string {
  if (count === 0) {
    return 'empty';
  }

  return `${count} items`;
}
```

#### `eslint/no-lonely-if`

No `if` as the only statement in an `else`. Write `else if`.

**Why:** `else if` says the same thing with one level less nesting.

Bad:

```ts
export function shippingLabel(express: boolean, total: number): string {
  let label = 'standard';
  if (express) {
    label = 'next day';
  } else {
    if (total > 50) {
      label = 'free';
    }
  }
  return label;
}
```

Good:

```ts
export function shippingLabel(express: boolean, total: number): string {
  let label = 'standard';
  if (express) {
    label = 'next day';
  } else if (total > 50) {
    label = 'free';
  }

  return label;
}
```

#### `eslint/curly`

Every `if`, `else`, `for`, `while` and `do` body is a block with braces.

**Why:** One shape for every branch: adding a second statement never silently falls outside the condition.

Bad:

```ts
export function shippingCost(weightGrams: number): number {
  if (weightGrams <= 0) throw new Error('weight must be positive');

  return weightGrams * 0.01;
}
```

Good:

```ts
export function shippingCost(weightGrams: number): number {
  if (weightGrams <= 0) {
    throw new Error('weight must be positive');
  }

  return weightGrams * 0.01;
}
```

#### `unicorn/no-lonely-if`

No `if` as the only statement in an `if` without `else`. Merge the conditions with `&&`.

**Why:** One combined condition reads faster than two nested blocks.

Bad:

```ts
export function notify(active: boolean, email: string | undefined): void {
  if (active) {
    if (email) {
      sendEmail(email);
    }
  }
}
```

Good:

```ts
export function notify(active: boolean, email: string | undefined): void {
  if (active && email) {
    sendEmail(email);
  }
}
```

#### `eslint/no-constant-condition`

No conditions that never change, loops such as `while (true)` included.

**Why:** A constant condition is either dead code or a loop whose real exit is hidden somewhere in its body.

Bad:

```ts
export function drain(queue: string[]): void {
  while (true) {
    const job = queue.shift();
    if (job === undefined) {
      break;
    }
    run(job);
  }
}
```

Good:

```ts
export function drain(queue: string[]): void {
  let job = queue.shift();
  while (job !== undefined) {
    run(job);
    job = queue.shift();
  }
}
```

#### `eslint/no-unmodified-loop-condition`

No loop conditions whose variables never change inside the loop.

**Why:** If nothing in the loop changes the condition, the loop never stops once it starts. That is almost always a bug.

The bad version never lowers `remaining`, so it loops forever. Conditions that read a property or call a function, such as `index < items.length`, are not checked.

Bad:

```ts
export function countdown(start: number): void {
  let remaining = start;
  while (remaining > 0) {
    console.log(remaining);
  }
}
```

Good:

```ts
export function countdown(start: number): void {
  let remaining = start;
  while (remaining > 0) {
    console.log(remaining);
    remaining -= 1;
  }
}
```

#### `eslint/no-sequences`

No comma operator to run several expressions in one statement, parentheses or not.

**Why:** The comma operator hides a second statement inside one line and is easy to mistake for an argument list.

oxfmt wraps every sequence in parentheses, so parentheses are not allowed as a way out. The setup and update parts of a `for` loop, such as `for (let i = 0, n = items.length; i < n; i += 1)`, are still allowed.

Bad:

```ts
export function store(record: string): void {
  (log('saving'), save(record));
}
```

Good:

```ts
export function store(record: string): void {
  log('saving');
  save(record);
}
```

#### `eslint/no-implicit-coercion`

No shorthand type conversion. Spell it out.

**Why:** `!!`, `+` and `'' +` hide the conversion. `Number()`, `String()` or a real comparison say what happens.

Bad:

```ts
export function parse(items: string[], input: string, id: number): void {
  const hasItems = !!items.length;
  const quantity = +input;
  const label = '' + id;
  show(hasItems, quantity, label);
}
```

Good:

```ts
export function parse(items: string[], input: string, id: number): void {
  const hasItems = items.length > 0;
  const quantity = Number(input);
  const label = String(id);
  show(hasItems, quantity, label);
}
```

#### `eslint/no-nested-ternary`

No ternary inside a ternary.

**Why:** Nested ternaries make the reader pair up every `?` with its `:` in their head.

Bad:

```ts
export const size = (count: number): string => (count > 100 ? 'large' : count > 10 ? 'medium' : 'small');
```

Good:

```ts
export function size(count: number): string {
  if (count > 100) {
    return 'large';
  }
  if (count > 10) {
    return 'medium';
  }
  return 'small';
}
```

### Comments

#### `eslint/no-warning-comments`

No TODO, FIXME, HACK, XXX or TEMP in comments. Fix it now or track it in an issue.

**Why:** TODO comments pile up and nobody follows them up. An issue has an owner and shows up in planning.

Bad:

```ts
export async function load(url: string): Promise<Response> {
  // TODO: retry when the request fails
  return fetch(url);
}
```

Good:

```ts
export async function load(url: string): Promise<Response> {
  return fetchWithRetry(url);
}
```

#### `eslint/no-inline-comments`

No comments on the same line as code. Let the name say it.

**Why:** Comments at the end of a line get missed and go stale. A clear name keeps the meaning in the code.

Bad:

```ts
export const timeout = 5000; // milliseconds
```

Good:

```ts
export const timeoutMs = 5000;
```

#### `comments/adr-only`

No comments, except a short `// ADR-012: reason` where the code makes a deliberate choice, and directives for tools such as `oxlint-disable-next-line` or `@ts-expect-error`.

**Why:** Code should explain itself through names and small functions. Where it does something on purpose that looks wrong, an agent or a teammate will "fix" it; a one-line pointer to the ADR stops that and leaves the full reasoning in the ADR.

The comment starts with `ADR-`, a number, a colon and the reason. Also allowed: `oxlint-`/`eslint-disable` and `-enable`, `@ts-expect-error`, `/// <reference>`, `oxfmt-ignore`/`prettier-ignore`, `@vitest-environment`/`@jest-environment` and `c8`/`v8`/`istanbul ignore`. JSDoc is not allowed. A project can allow more with `["error", { "allow": ["^@license"] }]`: each entry is a regular expression tested against the comment text.

Bad:

```ts
export function retryDelayMs(): number {
  // wait a fixed second, backoff overloads the payment provider
  return 1000;
}
```

Good:

```ts
const FIXED_RETRY_DELAY_MS = 1000;

export function retryDelayMs(): number {
  // ADR-014: a fixed delay, because backoff bursts overload the payment provider
  return FIXED_RETRY_DELAY_MS;
}
```

### Functions

#### `eslint/max-depth`

Blocks nest at most 4 deep. Return or `continue` early, or extract a function.

**Why:** Every level of nesting is one more condition the reader has to keep in mind.

Bad:

```ts
export function syncAll(accounts: Account[]): void {
  for (const account of accounts) {
    if (account.active) {
      try {
        for (const invoice of account.invoices) {
          if (invoice.open) {
            sync(invoice);
          }
        }
      } catch {
        report(account);
      }
    }
  }
}
```

Good:

```ts
export function syncAll(accounts: Account[]): void {
  for (const account of accounts) {
    if (!account.active) {
      continue;
    }

    try {
      syncOpenInvoices(account);
    } catch {
      report(account);
    }
  }
}

function syncOpenInvoices(account: Account): void {
  for (const invoice of account.invoices) {
    if (invoice.open) {
      sync(invoice);
    }
  }
}
```

#### `eslint/max-nested-callbacks`

Callbacks nest at most 10 deep. Use `async`/`await` or named functions.

**Why:** Callback pyramids are hard to follow and hard to handle errors in. `await` reads top to bottom.

Bad:

```ts
loadUser(id, (user) => {
  loadTeam(user, (team) => {
    loadProjects(team, (projects) => {
      // ...and 8 more levels
    });
  });
});
```

Good:

```ts
export const user = await loadUser(id);
export const team = await loadTeam(user);
export const projects = await loadProjects(team);
```

#### `eslint/max-params`

Functions take at most 4 parameters. Pass an object instead.

**Why:** Past four parameters, callers mix up the order. With an object, every value is labeled where the function is called.

Bad:

```ts
export function createUser(name: string, email: string, role: string, team: string, active: boolean): void {
  save({ name, email, role, team, active });
}
```

Good:

```ts
interface NewUser {
  name: string;
  email: string;
  role: string;
  team: string;
  active: boolean;
}

export function createUser(user: NewUser): void {
  save(user);
}
```

#### `eslint/func-names`

No anonymous `function` expressions. Use an arrow function or give it a name.

**Why:** Arrow functions become the one way to write an unnamed function, and they never get their own `this`, so there are no `this` surprises.

Bad:

```ts
export const onSave = function () {
  persist();
};
```

Good:

```ts
export const onSave = () => {
  persist();
};
```

#### `eslint/complexity`

Functions have at most 15 branches (`if`, loops, `case`, `catch`, ternaries, `&&`, `||`, `??`). Use a lookup or split the function.

**Why:** Every branch is another path to read and test. Past 15, a function is usually doing several jobs.

Bad:

```ts
export function statusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'review':
      return 'In review';
    // ...and 14 more cases
    default:
      return 'Unknown';
  }
}
```

Good:

```ts
const STATUS_LABELS = new Map([
  ['draft', 'Draft'],
  ['review', 'In review'],
]);

export function statusLabel(status: string): string {
  return STATUS_LABELS.get(status) ?? 'Unknown';
}
```

#### `eslint/max-lines-per-function`

Functions are at most 100 lines, not counting blank lines and comments. Split them into named steps.

**Why:** A function that fits on a screen or two can be read in one go, and named steps describe what it does.

Bad:

```ts
export async function checkout(cart: Cart): Promise<void> {
  if (cart.items.length === 0) {
    throw new Error('The cart is empty');
  }
  let total = 0;
  for (const item of cart.items) {
    total += item.price * item.quantity;
  }
  const shipping = total > 5000 ? 0 : 495;
  await charge(cart.customer, total + shipping);
  await sendReceipt(cart.customer, total + shipping);
  // ...and 110 more lines
}
```

Good:

```ts
export async function checkout(cart: Cart): Promise<void> {
  const order = validated(cart);
  const priced = withPrices(order);
  await charge(priced);
  await sendReceipt(priced);
}
```

#### `eslint/max-lines`

Files are at most 400 lines, not counting blank lines and comments. Split them by responsibility.

**Why:** Big files usually hold several responsibilities, and splitting them keeps each file about one thing. Blank lines do not count, so spacing code into paragraphs is never penalized.

Bad:

```ts
export const withTax = (cents: number): number => Math.round(cents * 1.21);
export const discounted = (cents: number, percent: number): number => Math.round(cents * (1 - percent / 100));

export const shippingCost = (cents: number): number => (cents > 5000 ? 0 : 495);
export const deliveryDays = (express: boolean): number => (express ? 1 : 3);

export const receiptSubject = (orderId: string): string => `Your order ${orderId}`;
export const shippedSubject = (orderId: string): string => `Order ${orderId} is on its way`;

// ...and 600 more lines of pricing, shipping and emails
```

Good:

```ts
// emails.ts
export const receiptSubject = (orderId: string): string => `Your order ${orderId}`;
export const shippedSubject = (orderId: string): string => `Order ${orderId} is on its way`;

// pricing.ts
export const withTax = (cents: number): number => Math.round(cents * 1.21);
export const discounted = (cents: number, percent: number): number => Math.round(cents * (1 - percent / 100));

// shipping.ts
export const shippingCost = (cents: number): number => (cents > 5000 ? 0 : 495);
export const deliveryDays = (express: boolean): number => (express ? 1 : 3);
```

### Arrays

#### `unicorn/no-array-reduce`

No `reduce` or `reduceRight`. Use a loop.

**Why:** A loop reads top to bottom. `reduce` makes the reader track the running value and puts its starting value at the end. Typing that value often needs a cast, and copying it on every step is slow.

A simple sum such as `prices.reduce((sum, price) => sum + price, 0)` is still allowed.

Bad:

```ts
interface User {
  id: string;
}

export function byId(users: User[]): Map<string, User> {
  return users.reduce((lookup, user) => lookup.set(user.id, user), new Map<string, User>());
}
```

Good:

```ts
interface User {
  id: string;
}

export function byId(users: User[]): Map<string, User> {
  const lookup = new Map<string, User>();
  for (const user of users) {
    lookup.set(user.id, user);
  }

  return lookup;
}
```

#### `unicorn/no-array-for-each`

No `forEach`. Use `for...of`.

**Why:** `forEach` does not wait for `await`, and `return` inside it only skips one item. `for...of` handles both and also supports `break`.

Bad:

```ts
export function saveAll(items: string[]): void {
  items.forEach((item) => save(item));
}
```

Good:

```ts
export function saveAll(items: string[]): void {
  for (const item of items) {
    save(item);
  }
}
```

#### `unicorn/no-unreadable-array-destructuring`

No destructuring that skips several slots.

**Why:** Counting commas to see which item you get is easy to get wrong. An index says it directly.

Bad:

```ts
export function third(parts: string[]): string | undefined {
  const [, , value] = parts;
  return value;
}
```

Good:

```ts
export function third(parts: string[]): string | undefined {
  const value = parts[2];
  return value;
}
```

#### `unicorn/no-unreadable-iife`

No immediately called arrow functions whose body is a parenthesized expression.

**Why:** The reader has to work out the function and what it is called with before reaching the value. A plain expression says it directly.

Bad:

```ts
export const name = ((user) => (user ? user.name : 'guest'))(currentUser);
```

Good:

```ts
export const name = currentUser ? currentUser.name : 'guest';
```

### Whitespace

#### `paragraphs/declarations`

A blank line separates top-level declarations: after the imports, and around every function, class, interface, enum and multi-line statement. Constants (even multi-line ones), one-line type aliases and overload signatures may sit together.

**Why:** Whitespace is paragraphs. A file reads like a chapter when each declaration stands on its own, and a wall of code with no blank lines hides where one thing ends and the next begins.

Imports and re-exports such as `export { a } from './a'` stay grouped, and so do constants, even when one of them spans several lines. `oxlint --fix` adds the missing blank lines.

Bad:

```ts
import { readFileSync } from 'node:fs';
const ENCODING = 'utf8';
export interface Order {
  id: string;
  cents: number;
}
export function readOrders(path: string): Order[] {
  return parseOrders(readFileSync(path, ENCODING));
}
function parseOrders(text: string): Order[] {
  return text.split('\n').map((line) => ({ id: line, cents: 0 }));
}
```

Good:

```ts
import { readFileSync } from 'node:fs';

const ENCODING = 'utf8';
const SEPARATOR = '\n';

export interface Order {
  id: string;
  cents: number;
}

export function readOrders(path: string): Order[] {
  return parseOrders(readFileSync(path, ENCODING));
}

function parseOrders(text: string): Order[] {
  return text.split(SEPARATOR).map((line) => ({ id: line, cents: 0 }));
}
```

#### `paragraphs/guards`

A blank line follows a guard clause: an `if` without `else` that returns, throws, continues or breaks. Functions of three statements or fewer are exempt.

**Why:** Whitespace is paragraphs. Guards are the first phase of a function, and a blank line after them shows where the checks end and the work starts.

A guard may sit right before another `if` or a `return`, so a chain like `if (a) return x; if (b) return y; return z;` reads as one paragraph. `oxlint --fix` adds the missing blank lines.

Bad:

```ts
export function shippingCents(weightGrams: number, country: string): number {
  if (weightGrams <= 0) {
    throw new Error('weight must be positive');
  }
  const base = country === 'NL' ? 495 : 1295;
  const perKilo = Math.ceil(weightGrams / 1000) * 150;
  console.log(`shipping to ${country}`);

  return base + perKilo;
}
```

Good:

```ts
export function shippingCents(weightGrams: number, country: string): number {
  if (weightGrams <= 0) {
    throw new Error('weight must be positive');
  }

  const base = country === 'NL' ? 495 : 1295;
  const perKilo = Math.ceil(weightGrams / 1000) * 150;
  console.log(`shipping to ${country}`);

  return base + perKilo;
}
```

#### `paragraphs/result`

A blank line comes before the final `return` of a function. Functions of three statements or fewer, and a `return` that closes a chain of guard clauses, are exempt.

**Why:** Whitespace is paragraphs. The result is the last phase of a function, and setting it apart lets a reader jump straight to what the function gives back.

`oxlint --fix` adds the missing blank lines.

Bad:

```ts
export function invoiceTotal(lineCents: number[], vatRate: number): number {
  let subtotal = 0;
  for (const cents of lineCents) {
    subtotal += cents;
  }
  const vat = Math.round(subtotal * vatRate);
  return subtotal + vat;
}
```

Good:

```ts
export function invoiceTotal(lineCents: number[], vatRate: number): number {
  let subtotal = 0;
  for (const cents of lineCents) {
    subtotal += cents;
  }
  const vat = Math.round(subtotal * vatRate);

  return subtotal + vat;
}

export function discountCents(cents: number, code: string): number {
  if (code === 'HALF') {
    return cents / 2;
  }
  if (code === 'TENOFF') {
    return cents - 1000;
  }
  return cents;
}
```

## React rules

Set in `react.json`, on top of `base.json` in React projects. It also turns on the correctness rules of the `react` and `jsx-a11y` plugins.

### Hooks

#### `react/rules-of-hooks`

Hooks are called at the top level of a component or custom hook: never inside a condition, a loop, a nested function or after an early return.

**Why:** React matches each hook call to its state by call order. A hook that runs only sometimes shifts that order, and the component reads another hook's state.

oxlint has two versions of this rule. `react/rules-of-hooks` is the port of `eslint-plugin-react-hooks` and also catches hooks called in loops and in plain functions; `react/hooks` only reports conditional calls.

Bad:

```tsx
import { useState } from 'react';

export function DiscountField({ hasCode }: { hasCode: boolean }) {
  if (!hasCode) {
    return null;
  }

  const [code, setCode] = useState('');

  return <input aria-label="Discount code" value={code} onChange={(event) => setCode(event.target.value)} />;
}
```

Good:

```tsx
import { useState } from 'react';

export function DiscountField({ hasCode }: { hasCode: boolean }) {
  const [code, setCode] = useState('');
  if (!hasCode) {
    return null;
  }

  return <input aria-label="Discount code" value={code} onChange={(event) => setCode(event.target.value)} />;
}
```

#### `react/exhaustive-deps`

The dependency list of `useEffect`, `useMemo`, `useCallback` and friends names every value from the component that the callback reads.

**Why:** A missing dependency leaves the callback holding the value from an earlier render. Nothing crashes; the screen just shows stale data.

When an effect should not re-run for a value, move that value out of the component or read it through a ref, instead of leaving it out of the list.

Bad:

```tsx
import { useEffect, useState } from 'react';

declare function fetchStatus(orderId: string): Promise<string>;

export function OrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    void fetchStatus(orderId).then(setStatus);
  }, []);

  return <p>{status}</p>;
}
```

Good:

```tsx
import { useEffect, useState } from 'react';

declare function fetchStatus(orderId: string): Promise<string>;

export function OrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    void fetchStatus(orderId).then(setStatus);
  }, [orderId]);

  return <p>{status}</p>;
}
```

### Lists

#### `react/jsx-key`

Every element in a list built with `map` (or a literal array of elements) has a `key`.

**Why:** React uses the key to tell list items apart between renders. Without one it re-renders every item and moves state such as input text to the wrong row.

Bad:

```tsx
interface Order {
  id: string;
  name: string;
}

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map((order) => (
        <li>{order.name}</li>
      ))}
    </ul>
  );
}
```

Good:

```tsx
interface Order {
  id: string;
  name: string;
}

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>{order.name}</li>
      ))}
    </ul>
  );
}
```

#### `react/no-array-index-key`

A list item's `key` comes from the item, such as its id, not from its position in the array.

**Why:** An index key stays with the position, not the item. When the list is sorted, filtered or prepended, React keeps the old row's state and DOM for a different item.

Bad:

```tsx
interface Order {
  id: string;
  name: string;
}

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map((order, index) => (
        <li key={index}>{order.name}</li>
      ))}
    </ul>
  );
}
```

Good:

```tsx
interface Order {
  id: string;
  name: string;
}

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>{order.name}</li>
      ))}
    </ul>
  );
}
```

### Components

#### `react/function-component-definition`

A named component is a function declaration, not an arrow function or function expression assigned to a variable.

**Why:** One shape for every component: it is hoisted, its name shows in stack traces and React DevTools, and it reads the same as every other function in the codebase.

Bad:

```tsx
export const Greeting = ({ name }: { name: string }) => {
  return <p>Hello {name}</p>;
};
```

Good:

```tsx
export function Greeting({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}
```

#### `react/only-export-components`

A file that exports a component exports only components (and types).

**Why:** Fast refresh can only swap a module in place when every export is a component. One exported constant or helper makes every edit to that file reload the page and lose state.

Bad:

```tsx
export const MAX_ITEMS = 10;

export function CartBadge({ count }: { count: number }) {
  return <span>{Math.min(count, MAX_ITEMS)}</span>;
}
```

Good:

```tsx
const MAX_ITEMS = 10;

export function CartBadge({ count }: { count: number }) {
  return <span>{Math.min(count, MAX_ITEMS)}</span>;
}
```

#### `react/jsx-no-constructed-context-values`

A context provider's `value` is not an object, array or function created during render.

**Why:** A value created during render is new on every render, so every component that reads the context re-renders too, even when nothing in it changed. Wrap it in `useMemo` or `useCallback`.

Bad:

```tsx
import { createContext, type ReactNode, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  return <ThemeContext value={{ dark, toggle: () => setDark(!dark) }}>{children}</ThemeContext>;
}
```

Good:

```tsx
import { createContext, type ReactNode, useMemo, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const theme = useMemo(() => ({ dark, toggle: () => setDark(!dark) }), [dark]);

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}
```

### Forms

#### `react/button-has-type`

Every `<button>` has an explicit `type`: `button`, `submit` or `reset`.

**Why:** A button without a type is a submit button. Inside a form, a button meant to open a menu or clear a field submits the form instead.

Bad:

```tsx
export function ClearButton({ onClear }: { onClear: () => void }) {
  return <button onClick={onClear}>Clear</button>;
}
```

Good:

```tsx
export function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" onClick={onClear}>
      Clear
    </button>
  );
}
```

### Security

#### `react/jsx-no-target-blank`

A link with `target="_blank"` to another site also has `rel="noreferrer"`.

**Why:** Without it, older browsers give the opened page `window.opener`, so it can redirect your tab to a phishing page, and every browser sends it your page's full URL as the referrer.

Bad:

```tsx
export function DocsLink() {
  return (
    <a href="https://oxc.rs/docs" target="_blank">
      Docs
    </a>
  );
}
```

Good:

```tsx
export function DocsLink() {
  return (
    <a href="https://oxc.rs/docs" target="_blank" rel="noreferrer">
      Docs
    </a>
  );
}
```

#### `react/no-danger`

No `dangerouslySetInnerHTML`.

**Why:** Raw HTML skips React's escaping, so any user input that reaches it is a cross-site scripting hole. Render the content as elements, or turn the rule off on the one line that sanitizes it first.

Bad:

```tsx
export function Comment({ body }: { body: string }) {
  return <p dangerouslySetInnerHTML={{ __html: body }} />;
}
```

Good:

```tsx
export function Comment({ body }: { body: string }) {
  return <p>{body}</p>;
}
```

### Accessibility

#### `jsx-a11y/alt-text`

Every `<img>`, `<area>`, `<input type="image">` and `<object>` has a text alternative. Use `alt=""` for an image that is only decoration.

**Why:** Screen readers read the `alt` text in place of the image. Without it they read the file name, or skip an image that carries meaning.

Bad:

```tsx
export function Receipt({ url }: { url: string }) {
  return <img src={url} />;
}
```

Good:

```tsx
export function Receipt({ url }: { url: string }) {
  return <img src={url} alt="Receipt for your order" />;
}
```

#### `jsx-a11y/anchor-is-valid`

An `<a>` has an `href` that goes somewhere. No `href="#"`, no `javascript:` and no `<a onClick>` without a link.

**Why:** A link is for navigation: it can be opened in a new tab, bookmarked and reached by keyboard because of its `href`. An action such as cancelling an order belongs on a `<button>`, which keyboards and screen readers treat as one.

Bad:

```tsx
export function CancelOrder({ onCancel }: { onCancel: () => void }) {
  return <a onClick={onCancel}>Cancel order</a>;
}
```

Good:

```tsx
export function CancelOrder({ onCancel }: { onCancel: () => void }) {
  return (
    <p>
      <button type="button" onClick={onCancel}>
        Cancel order
      </button>
      <a href="/orders">Back to your orders</a>
    </p>
  );
}
```

#### `jsx-a11y/label-has-associated-control`

Every `<label>` has text and is tied to a form control, by wrapping it or with `htmlFor`.

**Why:** A screen reader announces an input by its label, and clicking a tied label focuses the input. A label that sits next to an input without being tied to it does neither.

Bad:

```tsx
export function EmailField() {
  return (
    <div>
      <label>Email</label>
      <input type="email" />
    </div>
  );
}
```

Good:

```tsx
export function EmailField() {
  return (
    <label>
      Email
      <input type="email" />
    </label>
  );
}
```

#### `jsx-a11y/no-autofocus`

No `autoFocus` prop.

**Why:** Autofocus moves a screen reader past the content above the field without warning, and on phones it pops up the keyboard over the page the moment it loads.

Bad:

```tsx
export function SearchField() {
  return (
    <label>
      Search orders
      <input type="search" autoFocus />
    </label>
  );
}
```

Good:

```tsx
export function SearchField() {
  return (
    <label>
      Search orders
      <input type="search" />
    </label>
  );
}
```

#### `jsx-a11y/click-events-have-key-events`

An element with `onClick` also handles the keyboard, with `onKeyDown`, `onKeyUp` or `onKeyPress`. Native buttons and links already do.

**Why:** What a mouse can do, a keyboard can do. People who navigate with a keyboard or a switch device cannot click, so a click-only handler locks them out.

Bad:

```tsx
export function OrderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen}>
      {name}
    </div>
  );
}
```

Good:

```tsx
export function OrderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}>
      {name}
    </button>
  );
}
```

#### `jsx-a11y/no-static-element-interactions`

Elements without a role, such as `<div>` and `<span>`, get no mouse or keyboard handlers. Use a `<button>` or a link instead.

**Why:** A clickable `div` is invisible to screen readers and cannot be reached with Tab. A `<button>` comes with the role, focus and Enter and Space handling for free.

Bad:

```tsx
export function OrderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <div onClick={onOpen} onKeyDown={onOpen}>
      {name}
    </div>
  );
}
```

Good:

```tsx
export function OrderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}>
      {name}
    </button>
  );
}
```

## Strict rules

Set in `strict.json`, an opt-in layer on top of `base.json` for projects that want named exports, no barrel files and kebab-case file names.

### Modules

#### `import/no-default-export`

Modules use named exports, never `export default`. Files that a tool requires to default-export, `*.config.*` and Storybook `*.stories.*`, are exempt.

**Why:** A named export has one name everywhere, so search, rename and auto-import find every use. A default export is renamed by each file that imports it.

Bad:

```ts
export default function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}
```

Good:

```ts
// format-price.ts
export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

// vite.config.ts
export default {
  build: { target: 'es2022' },
};
```

#### `oxc/no-barrel-file`

No barrel files: an `index.ts` that re-exports other modules with `export *`. Import from the module that defines the value.

**Why:** A barrel makes every importer load every module behind it, which slows builds, tests and dev servers, and it hides import cycles behind one path.

The rule is set with `threshold: 0`, so a single `export *` counts. It does not see named re-exports such as `export { a } from './a'`.

Bad:

```ts
// index.ts
export * from './invoices';
export * from './orders';

// invoices.ts
export interface Invoice {
  orderId: string;
}

// orders.ts
export interface Order {
  id: string;
}
```

Good:

```ts
// checkout.ts
import type { Invoice } from './invoices';
import type { Order } from './orders';

export function invoiceFor(order: Order): Invoice {
  return { orderId: order.id };
}

// invoices.ts
export interface Invoice {
  orderId: string;
}

// orders.ts
export interface Order {
  id: string;
}
```

### Files

#### `unicorn/filename-case`

File names are kebab-case: `order-summary.tsx`, not `OrderSummary.tsx`. A component keeps its PascalCase name inside the file.

**Why:** One naming style means nobody has to guess how a file is spelled, and it avoids imports that work on a case-insensitive Mac and break on Linux CI.

Bad:

```ts
export function OrderSummary(): string {
  return 'Order summary';
}
```

Good:

```ts
export function OrderSummary(): string {
  return 'Order summary';
}
```

<!-- rules:end -->
