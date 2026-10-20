"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { value: string; label: string };

type AutoSubmitSelectProps = {
  name: string;
  defaultValue?: string;
  options: Option[];
  /**
   * When provided, an extra first item is rendered so the selection can be
   * cleared back to "no filter" after picking a value. Radix Select cannot use
   * an empty string as an item value, so a sentinel is used and translated
   * back to "" when the form submits.
   */
  emptyOptionLabel?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
};

const EMPTY_OPTION_VALUE = "__all__";

/**
 * A Select that submits its enclosing <form> on change. Use inside a GET form
 * so changing sort/page-size/filters re-runs the server query while preserving
 * the other form fields.
 */
export function AutoSubmitSelect({
  name,
  defaultValue = "",
  options,
  emptyOptionLabel,
  id,
  className,
  ariaLabel,
}: AutoSubmitSelectProps) {
  const selectValue =
    emptyOptionLabel && defaultValue === "" ? EMPTY_OPTION_VALUE : defaultValue;

  return (
    <>
      <input
        type="hidden"
        id={`${name}-proxy`}
        name={name}
        defaultValue={selectValue}
      />
      <Select
        defaultValue={selectValue}
        onValueChange={(value) => {
          const input = document.getElementById(
            `${name}-proxy`,
          ) as HTMLInputElement | null;
          if (input) {
            input.value = value === EMPTY_OPTION_VALUE ? "" : value;
            input.form?.requestSubmit();
          }
        }}
      >
        <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {emptyOptionLabel ? (
            <SelectItem value={EMPTY_OPTION_VALUE}>
              {emptyOptionLabel}
            </SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
