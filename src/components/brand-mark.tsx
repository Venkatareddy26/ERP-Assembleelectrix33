/** The AE monogram shares its geometry with the downloadable SVG and favicon. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" width="44" height="44" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="13" fill="#D92D42"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M7 46 19 18h8l12 28h-8l-2.5-6h-12L14 46H7Zm12.3-13h6.4l-3.2-8-3.2 8Z" fill="white"/>
    <path d="M40 18h17v7H47v4h9v6h-9v4h10v7H40V18Z" fill="white"/>
  </svg>;
}
