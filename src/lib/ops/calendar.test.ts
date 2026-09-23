import { describe,expect,it } from 'vitest';
import { packCalendarLanes } from './calendar';
const cars = [{ id:'v',registration_number:'TN01',display_name:null }];
const booking = (id:string,start_at:string,end_at:string) => ({ id,vehicle_id:'v',start_at,end_at,status:'confirmed',customer:[{ full_name:'Meera' }] });
describe('calendar lanes in IST',() => {
 it('clips spans across either window boundary',() => {
  const spans = packCalendarLanes(cars,[booking('a','2025-12-31T00:00:00+05:30','2026-01-02T00:00:00+05:30'),booking('b','2026-01-02T12:00:00+05:30','2026-02-01T00:00:00+05:30')],[],'2026-01-01',3)[0].spans;
  expect(spans[0]).toMatchObject({ startDay:0,endDay:1,dayCount:1,startsBeforeWindow:true });
  expect(spans[1]).toMatchObject({ startDay:1,endDay:3,dayCount:2,endsAfterWindow:true });
 });
 it('reuses lanes for midnight back-to-back bookings',() => {
  const result = packCalendarLanes(cars,[booking('a','2026-01-01T00:00:00+05:30','2026-01-02T00:00:00+05:30'),booking('b','2026-01-02T00:00:00+05:30','2026-01-03T00:00:00+05:30')],[],'2026-01-01',3)[0];
  expect(result.laneCount).toBe(1);
 });
 it('separates same-day handovers and overlapping blocks visually',() => {
  const a = booking('a','2026-01-01T08:00:00+05:30','2026-01-01T12:00:00+05:30'), b = booking('b','2026-01-01T12:00:00+05:30','2026-01-01T18:00:00+05:30');
  const result = packCalendarLanes(cars,[a,b],[{ ...a,id:'block',reason:'Service' }],'2026-01-01',2)[0];
  expect(result.laneCount).toBe(3); expect(new Set(result.spans.map(s => s.lane)).size).toBe(3);
 });
 it('excludes rejected bookings and half-open boundary touches',() => { expect(packCalendarLanes(cars,[{ ...booking('r','2026-01-01','2026-01-02'),status:'rejected' },booking('outside','2025-12-30T00:00:00+05:30','2026-01-01T00:00:00+05:30')],[],'2026-01-01',1)[0].spans).toEqual([]); });
 it('rejects invalid windows',() => { expect(packCalendarLanes(cars,[],[],'not-a-date',14)).toEqual([]); });
});
