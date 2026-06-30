export const motionTokens = {
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  ease: [0.22, 1, 0.36, 1],
};

export function getMotionProps(reduceMotion, props) {
  if (reduceMotion) return { initial: false, animate: props.animate || {}, exit: undefined, transition: { duration: 0 } };
  return props;
}
