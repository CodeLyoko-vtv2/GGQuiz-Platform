import HelpModal from "./HelpModal";
import PremiumModal from "./PremiumModal";
import PrivacyModal from "./PrivacyModal";
import SettingsModal from "./SettingsModal";
import WallpaperLayer from "./WallpaperLayer";

function ProfileHost() {
  return (
    <>
      <WallpaperLayer />
      <SettingsModal />
      <PremiumModal />
      <PrivacyModal />
      <HelpModal />
    </>
  );
}

export default ProfileHost;
