/** Regex for slugs in the application orgs, scopes, registry names etc.
 * Names that don't match this regex will be rejected.
 *
 * ### Valid
 * ```txt
 * console
 * console0
 * console-0
 * ```
 *
 * ### Invalid
 * ```txt
 * Console
 * 0console
 * -console
 * console-
 * console--0
 * ```
 */
export const NAME_REGEX = /^(?![-0-9])(?!.*--)[a-z0-9]*(?:-[a-z0-9]+)*$/gi;
