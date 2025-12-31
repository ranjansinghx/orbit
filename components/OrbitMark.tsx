export default function OrbitMark({ size = 28, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={spin ? "animate-orbit-spin" : ""}
      aria-hidden="true"
    >
      <circle cx="16" cy="20" r="11.5" stroke="#FF5A36" strokeWidth="2.4" />
      <circle cx="24" cy="20" r="11.5" stroke="#35C7FF" strokeWidth="2.4" />
      <circle cx="20" cy="20" r="2.2" fill="#F2F1EC" />
    </svg>
  );
}
