import { beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('./bookings',() => ({ addBookingMedia:vi.fn(),getBookingMediaContext:vi.fn() }));
vi.mock('./storage',() => ({ DOCUMENTS_BUCKET:'rental-documents',IDENTITY_BUCKET:'rental-identity',uploadObject:vi.fn(),removeObjects:vi.fn() }));
import { addBookingMedia,getBookingMediaContext } from './bookings';
import { uploadObject,removeObjects } from './storage';
import { storeBookingMedia } from './media';
const base = { bookingId:'booking',phase:'delivery' as const,mediaType:'licence_front' as const };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getBookingMediaContext).mockResolvedValue({ id:'booking',end_at:'2026-01-01T00:00:00Z' }); vi.mocked(removeObjects).mockResolvedValue(undefined); });
describe('booking media pipeline',() => {
 it('rejects HEIC before upload',async () => { await expect(storeBookingMedia({ ...base,file:new File(['photo'],'front.heic',{ type:'image/heic' }) })).rejects.toMatchObject({ status:400 }); expect(uploadObject).not.toHaveBeenCalled(); });
 it('routes licences to the restricted bucket',async () => { await storeBookingMedia({ ...base,file:new File(['jpeg'],'front.jpg',{ type:'image/jpeg' }) }); expect(uploadObject).toHaveBeenCalledWith('rental-identity',expect.any(String),expect.any(ArrayBuffer),'image/jpeg'); expect(addBookingMedia).toHaveBeenCalledWith(expect.objectContaining({ bucket_id:'rental-identity',purge_after:'2026-04-01' })); });
 it('removes the object when an occupied licence slot rejects its row',async () => {
  vi.mocked(addBookingMedia).mockRejectedValue({ code:'23505' });
  await expect(storeBookingMedia({ ...base,file:new File(['jpeg'],'front.jpg',{ type:'image/jpeg' }) })).rejects.toMatchObject({ code:'LICENCE_SLOT_OCCUPIED' });
  expect(removeObjects).toHaveBeenCalledWith('rental-identity',[vi.mocked(uploadObject).mock.calls[0][1]]);
 });
 it('does not attempt object removal after a failed upload',async () => { vi.mocked(uploadObject).mockRejectedValue(new Error('offline')); await expect(storeBookingMedia({ ...base,file:new File(['jpeg'],'front.jpg',{ type:'image/jpeg' }) })).rejects.toThrow('offline'); expect(addBookingMedia).not.toHaveBeenCalled(); expect(removeObjects).not.toHaveBeenCalled(); });
});
