import {NodeViewProps, NodeViewWrapper} from "@tiptap/react";
import {useEffect, useMemo, useRef, useState} from "react";
import {Image} from "@mantine/core";
import {getFileUrl} from "@/lib/config.ts";
import clsx from "clsx";

export default function ImageView(props: NodeViewProps) {
  const {node, selected} = props;
  const {src, width, align, title} = node.attrs;
  const [nWidth, setNWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const alignClass = useMemo(() => {
    if (align === "left") return "alignLeft";
    if (align === "right") return "alignRight";
    if (align === "center") return "alignCenter";
    return "alignCenter";
  }, [align]);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      const {naturalWidth} = img;
      setNWidth(naturalWidth > ref.current.clientWidth ? ref.current.clientWidth : naturalWidth);
    };
  }, []);

  return (
    <NodeViewWrapper style={{display: "block"}} ref={ref}>
      <Image
        radius="md"
        fit="contain"
        w={nWidth * parseFloat(width) / 100}
        src={getFileUrl(src)}
        alt={title}
        className={clsx(selected ? "ProseMirror-selectednode" : "", alignClass)}
      />
    </NodeViewWrapper>
  );
}
