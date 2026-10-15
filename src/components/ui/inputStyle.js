import { TOKENS } from "../../styles/theme";

// Temporary bridge for native controls on screens still using style={inputStyle}.
// Migrated screens use Input/Select/Textarea and the shared CSS module instead.
export const inputStyle = {
  width: "100%",
  minHeight: 40,
  border: `1px solid ${TOKENS.ink3}`,
  borderRadius: TOKENS.radiusControl,
  padding: "8px 12px",
  fontSize: 14,
  color: TOKENS.ink,
  background: TOKENS.surface,
  fontFamily: "inherit",
  boxSizing: "border-box",
};
