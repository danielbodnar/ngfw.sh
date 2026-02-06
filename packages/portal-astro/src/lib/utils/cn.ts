/**
 * Tailwind CSS class name utility.
 *
 * @module lib/utils/cn
 */

/**
 * Merges multiple class names, filtering out falsy values.
 *
 * This is a simple utility for conditionally joining class names.
 * For more advanced use cases with Tailwind, consider using `clsx` + `tailwind-merge`.
 *
 * @param classes - Variable number of class name strings or boolean/undefined values
 * @returns Merged class name string
 *
 * @example
 * ```ts
 * cn('base-class', isActive && 'active', undefined, 'another-class')
 * // Returns: "base-class active another-class"
 * ```
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
