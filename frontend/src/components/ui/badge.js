import * as React from "react"

function Badge({ children, variant = "default", className = "", ...props }) {
  const variantStyles = {
    default: "bg-slate-900 text-white",
    secondary: "bg-slate-100 text-slate-900",
    destructive: "bg-rose-500 text-white",
    outline: "border border-slate-200 text-slate-900"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge }
