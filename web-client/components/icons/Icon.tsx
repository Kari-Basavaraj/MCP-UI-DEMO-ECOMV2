import { ComponentProps, createElement, useMemo } from "react";
import { icons } from "lucide-react";
import clsx from "clsx";

type IconName = keyof typeof icons;

type IconProps = {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
} & Omit<ComponentProps<"span">, "color">;

function normalizeName(name: string): IconName | null {
  const cleaned = name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  if (cleaned && cleaned in icons) return cleaned as IconName;
  const lower = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  if (lower in icons) return lower as IconName;
  return null;
}

export function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  color = "currentColor",
  className,
  ariaLabel,
  ...rest
}: IconProps) {
  const iconName = useMemo(() => normalizeName(name), [name]);
  const LucideIcon = iconName ? icons[iconName] : icons["Square"];

  return (
    <span
      role="img"
      aria-label={ariaLabel || name}
      className={clsx("inline-flex items-center justify-center", className)}
      {...rest}
    >
      {createElement(LucideIcon, { size, strokeWidth, color })}
    </span>
  );
}

export type { IconProps };
