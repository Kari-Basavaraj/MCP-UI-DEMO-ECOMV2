type FigmaStubProps = {
  name: string;
  description?: string;
};

export function FigmaStub({ name, description }: FigmaStubProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "8px",
        padding: "12px",
        border: "1px dashed var(--sds-color-border-default-default, #d9d9d9)",
        borderRadius: "var(--sds-size-radius-200, 8px)",
        color: "var(--sds-color-text-default-secondary, #757575)",
        fontSize: "var(--sds-typo-body-size-small, 14px)",
      }}
      aria-label={name}
      data-figma-component={name}
    >
      <strong style={{ color: "var(--sds-color-text-default-default, #1e1e1e)" }}>{name}</strong>
      {description ? <span>{description}</span> : <span>Linked via Code Connect</span>}
    </div>
  );
}

export type { FigmaStubProps };
