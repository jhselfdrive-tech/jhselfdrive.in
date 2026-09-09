// Renders structured data. The `<` escape is the XSS guard for dangerouslySetInnerHTML — keep it.
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return <>{blocks.map((block, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, "\\u003c") }} />)}</>;
}
