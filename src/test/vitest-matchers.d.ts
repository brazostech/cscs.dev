/**
 * Type fix for @testing-library/jest-dom under Vitest 5.
 *
 * The runtime matchers come from `@testing-library/jest-dom/vitest` (see
 * setup.ts). Vitest 5 also ships its own browser-mode DOM matcher types, which
 * the `vitest/config` import in vitest.config.ts pulls into the program. Those
 * declare `toHaveTextContent(text?: string | number)` (strict equality, no
 * RegExp) and shadow jest-dom's signature, so `toHaveTextContent(/re/i)` fails
 * typechecking even though the jsdom tests still run jest-dom's matcher.
 *
 * Re-declare jest-dom's signature on `Matchers`, which `Assertion` extends.
 * `Assertion` is not augmented here because jest-dom, `@vitest/browser` and
 * Vitest itself declare it with three different type parameter lists, so any
 * further declaration of it reports TS2428 under `--skipLibCheck false`. The
 * type parameters below are copied exactly from Vitest's `Matchers`. Remove this
 * file if the tests move to Vitest browser mode, where `toMatchTextContent`
 * replaces the RegExp form.
 */
import "vitest";

declare module "vitest" {
  // The type parameters must match Vitest's `Matchers` exactly; `T` is unused.
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    T = unknown,
  > {
    toHaveTextContent(
      text: string | number | RegExp,
      options?: { normalizeWhitespace: boolean },
    ): R;
  }
}
