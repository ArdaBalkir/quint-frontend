import { Box } from "@mui/material";
import ratSprite from "../assets/Rat-White-Walk.png";

// Horizontal sprite sheet: 128x32px total, 4 frames of 32x32px each.
// Frame stepping is done via a CSS animation (see .rat-run-sprite in App.css),
// which shifts background-position by exactly one frame width in pixels so
// frames are shown one at a time instead of overlaid/stretched.
const FRAME_COUNT = 4;
const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 32;
const SHEET_WIDTH = FRAME_COUNT * FRAME_WIDTH;

// a loader animatio with a rat sprite
const RunningRatLoader = ({ height = 40, sx = {} }) => {
  const scale = height / FRAME_HEIGHT;
  const width = FRAME_WIDTH * scale;

  return (
    <Box
      role="img"
      aria-label="Loading"
      className="rat-run-sprite"
      sx={{
        width,
        height,
        backgroundImage: `url(${ratSprite})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${SHEET_WIDTH * scale}px ${FRAME_HEIGHT * scale}px`,
        imageRendering: "pixelated",
        "--rat-frame-width": `${FRAME_WIDTH * scale}px`,
        ...sx,
      }}
    />
  );
};

export default RunningRatLoader;
