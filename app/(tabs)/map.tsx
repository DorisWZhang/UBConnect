"use client";

import { useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import React from "react";

export default function Intro() {
  const position1 = { lat: 49.2606, lng: -123.2460 };
  const position = { lat: 49.266562, lng: -123.250062};
  const position3 = {lat: 49.264312, lng: -123.255938};
  const [open, setOpen] = useState(false);

  return (
    <APIProvider apiKey={'AIzaSyC5xYHLYYgfFKpK6Zmmt1dWCLNGrOEPdCw'}>
      <div style={{ height: "100vh", width: "100%" }}>
        <Map defaultZoom={13} center={position} mapId={'5616403b42848ff7'}>
          <AdvancedMarker position={position1} onClick={() => setOpen(true)}>
            <Pin
              background={"cyan"}
              borderColor={"green"}
            />
            <AdvancedMarker position={position} onClick={() => setOpen(true)}>
            <Pin
              background={"cyan"}
              borderColor={"green"}
            />
            <AdvancedMarker position={position3} onClick={() => setOpen(true)}>
            <Pin
              background={"cyan"}
              borderColor={"green"}
            />
          </AdvancedMarker>
          </AdvancedMarker>
          </AdvancedMarker>

          {open && (
            <InfoWindow position={position} onCloseClick={() => setOpen(false)}>
              <p>I'm in Hamburg</p>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}