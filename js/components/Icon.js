import React, { useContext } from "react";
import { StyleSheet, Pressable, View, Text } from "react-native";

import UserContext from "../variables/context";

// Navigation
import ChevronLeft from "../../assets/icons/ChevronLeft.svg";
import ChevronRight from "../../assets/icons/ChevronRight.svg";
import ChevronUp from "../../assets/icons/ChevronUp.svg";
import ChevronDown from "../../assets/icons/ChevronDown.svg";
import Close from "../../assets/icons/Close.svg";

// Settings
import Help from "../../assets/icons/QuestionMark.svg";
import Chat from "../../assets/icons/Chat.svg";
import Name from "../../assets/icons/Text.svg";
import Notifications from "../../assets/icons/Notification.svg";
import Theme from "../../assets/icons/PaintBrush.svg";
import Terms from "../../assets/icons/Document.svg";
import Privacy from "../../assets/icons/Private.svg";
import Delete from "../../assets/icons/Delete.svg";
import Logout from "../../assets/icons/SignOut.svg";

// Customize
import Regenerate from "../../assets/icons/Sync.svg";
import Jump from "../../assets/icons/Insert.svg";
import Goal from "../../assets/icons/Target.svg";
import Duration from "../../assets/icons/Stopwatch.svg";
import Frequency from "../../assets/icons/List.svg";
import Equipment from "../../assets/icons/Gym.svg";
import Space from "../../assets/icons/Location.svg";
import Athleticism from "../../assets/icons/HeartRate.svg";
import Experience from "../../assets/icons/History.svg";
import Units from "../../assets/icons/Scales.svg";

// Home
import Share from "../../assets/icons/Share.svg";
import More from "../../assets/icons/More.svg";
import Verified from "../../assets/icons/Verified.svg";

// Profile
import CircleUser from "../../assets/icons/CircleUser.svg";
import Clock from "../../assets/icons/Clock.svg";
import Location from "../../assets/icons/Location.svg";
import Gear from "../../assets/icons/Gear.svg";

// Interaction
import Swap from "../../assets/icons/Sync.svg";
import Plus from "../../assets/icons/Add.svg";
import Minus from "../../assets/icons/Minus.svg";
import Check from "../../assets/icons/Checkmark.svg";

// Playback
import Play from "../../assets/icons/PlaybackPlay.svg";
import Pause from "../../assets/icons/PlaybackPause.svg";
import Forward from "../../assets/icons/PlaybackFastForward.svg";
import Rewind from "../../assets/icons/PlaybackRewind.svg";

// Paywall
import Progressive from "../../assets/icons/Activity.svg";
import Movements from "../../assets/icons/Walk.svg";
import Personal from "../../assets/icons/Hanafuda.svg";

const Icon = ({
  icon,
  emoji,
  color,
  background,
  width = 40,
  height = 40,
  fill = "70%",
  shadow = true,
  hitSlop = 20,
  onPress,
  onLongPress,
  menuItems,
  onPressMenuItem,
  style,
}) => {
  const {
    theme: { colors, dark },
  } = useContext(UserContext);

  const p = {
    style: { color: color || colors.text },
    width: fill,
    height: fill,
  };

  const showBorder = shadow && background !== colors.accent;

  return (
    <Pressable
      hitSlop={hitSlop}
      small
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!(onPress || onLongPress)}
    >
      <View
        style={[
          {
            width,
            height,
            borderRadius: 40,
            backgroundColor: background || colors.card,
            alignItems: "center",
            justifyContent: "center",

            shadowColor: "black",
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 6,
            shadowOpacity: dark && showBorder ? 0.25 : 0,

            borderColor: colors.border,
            borderWidth: !dark && showBorder ? 1 : 0,
          },
          style,
        ]}
      >
        {emoji && <Text style={{ fontSize: 20 }}>{emoji}</Text>}

        {/* Navigation */}
        {icon === "left" && <ChevronLeft {...p} />}
        {icon === "right" && <ChevronRight {...p} />}
        {icon === "up" && <ChevronUp {...p} />}
        {icon === "down" && <ChevronDown {...p} />}
        {icon === "cross" && <Close {...p} />}

        {/* Settings */}
        {icon === "help" && <Help {...p} />}
        {icon === "chat" && <Chat {...p} />}
        {icon === "name" && <Name {...p} />}
        {icon === "notifications" && <Notifications {...p} />}
        {icon === "theme" && <Theme {...p} />}
        {icon === "terms" && <Terms {...p} />}
        {icon === "privacy" && <Privacy {...p} />}
        {icon === "delete" && <Delete {...p} />}
        {icon === "logout" && <Logout {...p} />}

        {/* Customize */}
        {icon === "regenerate" && <Regenerate {...p} />}
        {icon === "jump" && <Jump {...p} />}
        {icon === "goal" && <Goal {...p} />}
        {icon === "duration" && <Duration {...p} />}
        {icon === "frequency" && <Frequency {...p} />}
        {icon === "equipment" && <Equipment {...p} />}
        {icon === "space" && <Space {...p} />}
        {icon === "athleticism" && <Athleticism {...p} />}
        {icon === "experience" && <Experience {...p} />}
        {icon === "units" && <Units {...p} />}

        {/* Paywall */}
        {icon === "progressive" && <Progressive {...p} />}
        {icon === "movements" && <Movements {...p} />}
        {icon === "personal" && <Personal {...p} />}

        {/* Interactions */}
        {icon === "plus" && <Plus {...p} />}
        {icon === "minus" && <Minus {...p} />}
        {icon === "swap" && <Swap {...p} />}
        {icon === "check" && <Check {...p} />}

        {/* Home */}
        {icon === "share" && <Share {...p} />}
        {icon === "more" && <More {...p} />}
        {icon === "verified" && <Verified {...p} />}

        {/* Playback */}
        {icon === "play" && <Play {...p} />}
        {icon === "pause" && <Pause {...p} />}
        {icon === "forward" && <Forward {...p} />}
        {icon === "rewind" && <Rewind {...p} />}

        {/* Profile */}
        {icon === "settings" && <Gear {...p} />}
        {icon === "clock" && <Clock {...p} />}
        {icon === "location" && <Location {...p} />}
        {icon === "profile" && <CircleUser {...p} />}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
});

export default Icon;
