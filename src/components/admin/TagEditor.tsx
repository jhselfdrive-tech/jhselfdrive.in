import { updateCustomerTagsAction } from "@/app/admin/actions/customers";

export function TagEditor({ customerId, tags }: { customerId: string; tags: string[] }) {
  return <>
    <div className="admin-tag-list">
      {tags.map((tag) => <span className="admin-segment" key={tag}>{tag}</span>)}
    </div>
    <form action={updateCustomerTagsAction} className="admin-inline-form">
      <input type="hidden" name="id" value={customerId} />
      <input
        aria-label="Manual customer tags"
        className="admin-tag-input"
        name="tags"
        defaultValue={tags.join(", ")}
        placeholder="vip, corporate, festival-offer"
      />
      <button className="admin-primary-button" type="submit">Save tags</button>
    </form>
  </>;
}
