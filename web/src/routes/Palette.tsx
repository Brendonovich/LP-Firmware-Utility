import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { InputEventSysex } from "webmidi";

import PaletteGrid from "../components/PaletteGrid";
import ColorPicker from "../components/ColorPicker";

import useLaunchpads from "../hooks/useLaunchpads";
import { useAppState } from "../hooks";

import { LaunchpadType } from "../constants";
import {
  hexToRgb,
  hexToHsv,
  parseRetinaPalette,
  createRetinaPalette,
} from "../utils";

const Palette = () => {
  const { launchpads } = useLaunchpads();

  const palette = useAppState(({ palette }) => palette.colors);
  const [hsv, setHsv] = useState([0, 0, 0]);

  const [selectedColor, setSelectedColor] = useState(0);
  const [paletteIndex, setPaletteIndex] = useState(1);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const dispatch = useDispatch();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (selectedColor === undefined) return;
      let newSelected = selectedColor;
      switch (event.key) {
        case "w":
        case "ArrowUp":
          if (selectedColor % 64 >= 0 && selectedColor % 64 <= 7) return;
          setSelectedColor(selectedColor - 8);
          break;
        case "a":
        case "ArrowLeft":
          if (selectedColor > 63)
            if (selectedColor % 8 === 0) newSelected -= 57;
            else newSelected--;
          else {
            if (selectedColor % 8 === 0) return;
            else newSelected--;
          }
          setSelectedColor(newSelected);
          break;
        case "s":
        case "ArrowDown":
          if (selectedColor % 64 >= 56 && selectedColor % 64 <= 63) return;
          setSelectedColor(selectedColor + 8);
          break;
        case "d":
        case "ArrowRight":
          if (selectedColor > 63)
            if (selectedColor % 8 === 7) return;
            else newSelected++;
          else {
            if (selectedColor % 8 === 7) newSelected += 57;
            else newSelected++;
          }
          setSelectedColor(newSelected);
          break;
      }
    },
    [selectedColor]
  );

  const handleColorChanged = useCallback(
    (color) =>
      selectedColor !== undefined &&
      dispatch({
        type: "SET_PALETTE_COLOR",
        payload: {
          index: selectedColor,
          color: hexToRgb(color),
        },
      }),

    [dispatch, selectedColor]
  );

  const handlePaletteUpload = useCallback(() => {
    launchpads.forEach((lp) => {
      if (lp.type !== LaunchpadType.CFW) return;

      let convertedPalette = new Array<number>(512);

      Object.entries(palette).forEach(([index, color]) => {
        let colorIndex = parseInt(index) * 4;
        convertedPalette[colorIndex] = parseInt(index);
        convertedPalette[colorIndex + 1] = color[0];
        convertedPalette[colorIndex + 2] = color[1];
        convertedPalette[colorIndex + 3] = color[2];
      });

      lp.uploadPalette(convertedPalette, paletteIndex - 1);
    });
  }, [launchpads, palette, paletteIndex]);

  const importPalette = useCallback(
    (file?: File) => {
      if (!file) return;
      parseRetinaPalette(file).then((newPalette) =>
        dispatch({ type: "SET_PALETTE", payload: newPalette })
      );
    },
    [dispatch]
  );

  const downloadedPalette = useRef<any>({});
  const handleCFWSysex = useCallback(
    ({ data }: InputEventSysex) => {
      if (data[7] === 123) downloadedPalette.current = {};
      else if (data[7] === 35)
        downloadedPalette.current[data[8]] = [data[9], data[10], data[11]];
      else if (data[7] === 125)
        dispatch({ type: "SET_PALETTE", payload: downloadedPalette.current });
    },
    [dispatch]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    launchpads.forEach(
      (lp) =>
        lp.type === LaunchpadType.CFW &&
        lp.input.addListener("sysex", "all", handleCFWSysex)
    );
    return () => {
      launchpads.forEach(
        (lp) =>
          lp.type === LaunchpadType.CFW &&
          lp.input.removeListener("sysex", "all", handleCFWSysex)
      );
    };
  }, [launchpads, handleCFWSysex]);

  const selectedRef = useRef(0);
  useEffect(() => {
    if (selectedRef.current !== selectedColor) {
      setHsv(hexToHsv(palette[selectedColor]));
      selectedRef.current = selectedColor;
    }
  }, [palette, selectedColor]);

  let cfwPresent = launchpads.some((lp) => lp.type === LaunchpadType.CFW);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <PaletteGrid
        selectedColor={selectedColor}
        onColorClicked={(index) => setSelectedColor(index)}
      />
      <p style={{ margin: "5px 0 0" }}>Selected Velocity: {selectedColor}</p>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <ColorPicker hsv={hsv} onColorChange={handleColorChanged} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 10,
            padding: 5,
            height: "100%",
          }}
        >
          <button onClick={() => fileRef.current!.click()}>Import</button>
          <input
            style={{ display: "none" }}
            onChange={(e) => importPalette(e.target.files?.[0])}
            type="file"
            ref={fileRef}
          />
          <button onClick={() => createRetinaPalette(palette)}>Export</button>

          {cfwPresent && (
            <>
              <button style={{ marginTop: 25 }} onClick={handlePaletteUpload}>
                Upload
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <p style={{ margin: 0, marginRight: 5 }}>Index:</p>
                <select
                  onChange={(e) => setPaletteIndex(parseInt(e.target.value))}
                  value={paletteIndex}
                  style={{ width: 40, height: 30 }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
      <Link to="/" style={{ color: "#888888", marginTop: 10 }}>
        {"< Firmware Utility"}
      </Link>
    </div>
  );
};

export default Palette;
