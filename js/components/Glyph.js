import React from "react";
import Svg, { Path, Rect, Circle } from "react-native-svg";

/*
  Small line icons drawn in code for the session screens, where the
  Programme icon set has no match (flame, heart, …). Stroke follows `color`.
*/

const paths = {
  flame: <Path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2c0-4 2-6 2-10z" />,
  heart: <Path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" />,
  cross: <Path d="M6 6l12 12M18 6L6 18" />,
  right: <Path d="M9 6l6 6-6 6" />,
  left: <Path d="M15 6l-6 6 6 6" />,
  swap: <Path d="M4 8h13l-3-3M20 16H7l3 3" />,
  pencil: <Path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  bookmark: <Path d="M6.5 3.5h11v17L12 16.5l-5.5 4v-17z" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
  people: (
    <>
      <Circle cx="9" cy="8.5" r="3.5" />
      <Path d="M2.5 20c.9-3.3 3.3-5 6.5-5s5.6 1.7 6.5 5" />
      <Path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 15.3c2 .6 3.4 2.2 4 4.7" />
    </>
  ),
  bolt: <Path d="M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z" />,
  trophy: (
    <>
      <Path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4z" />
      <Path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="6.5" />
      <Path d="M16 16l4 4" />
    </>
  ),
  gear: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  restart: (
    <>
      <Path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <Path d="M4 4v4h4" />
    </>
  ),
};

const Glyph = ({ name, size = 18, color = "#0A0A0A", fill, strokeWidth = 2 }) => {
  if (name === "play")
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M7 5l12 7-12 7z" fill={color} />
      </Svg>
    );
  if (name === "pause")
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="6" y="5" width="4" height="14" rx="1" fill={color} />
        <Rect x="14" y="5" width="4" height="14" rx="1" fill={color} />
      </Svg>
    );
  if (name === "dot")
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="5" fill={color} />
      </Svg>
    );
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill || "none"}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
};

export default Glyph;
