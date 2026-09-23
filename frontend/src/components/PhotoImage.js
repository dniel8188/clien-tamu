import React, { useState } from "react";
import { fileUrl } from "@/lib/api";

// Progressive blur-in image that loads through the backend proxy.
export default function PhotoImage({ photo, className = "", onClick, style }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={fileUrl(photo)}
      alt={photo.caption || "wedding photo"}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onClick={onClick}
      style={style}
      className={`blur-load ${loaded ? "loaded" : ""} ${className}`}
      data-testid={`photo-img-${photo.id}`}
    />
  );
}
