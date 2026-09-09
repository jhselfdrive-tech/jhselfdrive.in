type Props = { items: readonly { question: string; answer: string }[]; title?: string; copy?: string; eyebrow?: string };

export function FaqSection({ items, eyebrow = "Good to know", title = "Questions, answered.", copy = "Still unsure? Message us—we’re happy to help." }: Props) {
  return <section className="section" id="faq"><div className="shell faq-grid"><div><span className="eyebrow">{eyebrow}</span><h2 className="section-title">{title}</h2><p className="section-copy">{copy}</p></div><div className="faq-list">{items.map((item) => <details className="faq-item" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>;
}
