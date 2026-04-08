"use client";

import { cn } from "@/lib/utils";
import { useProviderModelOptions } from "@/hooks/use-provider-model-options";

interface ProviderModelFieldProps {
  providerId?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  includeDefaultOption?: boolean;
  defaultOptionLabel?: string;
  label?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  messageClassName?: string;
  loadEnabled?: boolean;
}

export function ProviderModelField({
  providerId,
  value,
  onChange,
  disabled = false,
  includeDefaultOption = false,
  defaultOptionLabel = "Use provider default",
  label = "Model",
  helperText,
  containerClassName,
  labelClassName,
  selectClassName,
  messageClassName,
  loadEnabled = true,
}: ProviderModelFieldProps) {
  const { data, loading, error } = useProviderModelOptions(providerId, loadEnabled && !!providerId);
  const savedValue = value?.trim() || "";
  const hasOptions = (data?.modelOptions.length || 0) > 0;
  const invalidSavedValue =
    savedValue && hasOptions && !data?.modelOptions.some((option) => option.id === savedValue)
      ? savedValue
      : null;
  const selectValue = invalidSavedValue ? "" : savedValue;
  const helper =
    helperText ||
    "These choices come directly from the provider and usually trade off speed against capability.";

  if (!providerId) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <label className={labelClassName}>
        <span>{label}</span>
        {loading ? (
          <p className={cn("mt-1 text-[11px] text-muted-foreground", messageClassName)}>
            Loading available models...
          </p>
        ) : error ? (
          <p className={cn("mt-1 text-[11px] text-muted-foreground", messageClassName)}>
            {error}
          </p>
        ) : !hasOptions ? (
          <p className={cn("mt-1 text-[11px] text-muted-foreground", messageClassName)}>
            This provider does not advertise selectable models.
          </p>
        ) : (
          <>
            <select
              value={selectValue}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              className={selectClassName}
            >
              {includeDefaultOption && (
                <option value="">{defaultOptionLabel}</option>
              )}
              {data?.modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <p className={cn("mt-1 text-[11px] text-muted-foreground", messageClassName)}>
              {helper}
            </p>
            {invalidSavedValue && (
              <p className={cn("mt-1 text-[11px] text-amber-500", messageClassName)}>
                Saved model <code className="font-mono">{invalidSavedValue}</code> is no longer available and will fall back when you save.
              </p>
            )}
          </>
        )}
      </label>
    </div>
  );
}
