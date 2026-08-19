import { AppRecoveryScreen } from "@/components/omniwave/app-recovery-screen";

/** A clear, recoverable destination for unknown Expo Router paths. */
export default function NotFoundScreen() {
  return (
    <AppRecoveryScreen
      title="هذه الوجهة غير متاحة"
      description="قد يكون الرابط قديمًا أو أن الشاشة لم تعد موجودة. عد إلى الرئيسية للمتابعة."
    />
  );
}
