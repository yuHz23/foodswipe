import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge className: clsx + tailwind-merge (xử lý xung đột tailwind class) */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
