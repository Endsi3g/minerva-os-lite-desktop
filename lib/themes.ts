// Stub for BillingSDK compatibility. Returns empty CSS-in-JS styles.
// BillingSDK dialogs apply these as inline style={{ ...themeStyles }}.
export function getThemeStyles(
  _theme: string,
  _darkMode: boolean,
): React.CSSProperties {
  return {};
}
