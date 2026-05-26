import AppButton, { type AppButtonProps } from "./AppButton";

export function DrawerButton({ size = "md", ...props }: AppButtonProps) {
  return <AppButton size={size} {...props} />;
}
