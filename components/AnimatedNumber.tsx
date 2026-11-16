"use client";

import NumberFlow, { type NumberFlowProps } from "@number-flow/react";
import { useEffect, useState } from "react";

type Props = Omit<NumberFlowProps, "value"> & { value: number };

const AnimatedNumber = ({ value, ...props }: Props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return <NumberFlow {...props} value={mounted ? value : 0} />;
};

export default AnimatedNumber;
