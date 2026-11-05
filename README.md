# oxc-defaults

Shared oxlint and oxfmt settings for TypeScript projects, with a bad and a good example for every lint rule.

## Use them in a project

Download both configs into your project root:

```sh
curl -fsSLO https://raw.githubusercontent.com/twankruiswijk/oxc-defaults/main/.oxlintrc.json
curl -fsSLO https://raw.githubusercontent.com/twankruiswijk/oxc-defaults/main/.oxfmtrc.json
```

Install the tools:

```sh
pnpm add -D oxlint oxlint-tsgolint oxfmt
```

Add the scripts, replacing `src` with your source folder:

```json
"lint": "oxlint --type-aware --deny-warnings src",
"fmt": "oxfmt src",
"fmt:check": "oxfmt --check src"
```

## Gotchas

- `--type-aware` needs `oxlint-tsgolint`. Without it, `no-unnecessary-condition` and `no-unsafe-type-assertion` do not run.
- `--deny-warnings` makes oxlint's built-in checks, which are warnings by default, fail the run too.
- `plugins` replaces oxlint's default plugin list instead of adding to it. Keep `typescript`, `unicorn` and `oxc` in it, or their rules turn off without any error.

## Formatting

- `printWidth: 140`: lines wrap after 140 characters.
- `singleQuote: true`: strings use single quotes, so `const greeting = "hello";` becomes `const greeting = 'hello';`.

## Changing a rule

1. Change the rule in `.oxlintrc.json`.
2. Add or update its folder `rules/<plugin>/<rule>/`. `rule.json` holds the group, summary and why. `bad.ts` and `good.ts` hold the examples; use `bad/` and `good/` folders when an example needs several files.
3. Run `pnpm readme` to regenerate the rule list below, then `pnpm check`.

`pnpm check` fails when a bad example is not flagged, a good example is flagged by any rule, a rule has no folder, or this README is out of date. CI runs it on every push and pull request. Rules marked `"sketch": true` (the size limits) show their examples without linting them.

## Lint rules

Every rule below is an error. On top of these, oxlint runs its built-in correctness checks.

<!-- rules:start -->

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
  if (!isUser(value)) throw new Error('Not a user');
  return value;
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
    if (job === undefined) break;
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
  if (count > 100) return 'large';
  if (count > 10) return 'medium';
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
    if (!account.active) continue;

    try {
      syncOpenInvoices(account);
    } catch {
      report(account);
    }
  }
}

function syncOpenInvoices(account: Account): void {
  for (const invoice of account.invoices) {
    if (invoice.open) sync(invoice);
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
const user = await loadUser(id);
const team = await loadTeam(user);
const projects = await loadProjects(team);
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
function statusLabel(status: string): string {
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

function statusLabel(status: string): string {
  return STATUS_LABELS.get(status) ?? 'Unknown';
}
```

#### `eslint/max-lines-per-function`

Functions are at most 100 lines, not counting blank lines and comments. Split them into named steps.

**Why:** A function that fits on a screen or two can be read in one go, and named steps describe what it does.

Bad:

```ts
async function checkout(cart: Cart): Promise<void> {
  // 120 lines that validate, price, charge and email
}
```

Good:

```ts
async function checkout(cart: Cart): Promise<void> {
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

```text
orders.ts                 (650 lines: pricing, shipping and emails)
```

Good:

```text
orders/pricing.ts         (210 lines)
orders/shipping.ts        (180 lines)
orders/emails.ts          (140 lines)
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

<!-- rules:end -->
