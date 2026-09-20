"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-sm no-print ml-auto" onClick={() => window.print()}>
      Print
    </button>
  );
}
