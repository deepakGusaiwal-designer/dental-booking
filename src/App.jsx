import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SiteHeader from "@/components/SiteHeader";
import BookingForm from "@/components/BookingForm";
import AdminPanel from "@/components/AdminPanel";
import { useBooking } from "@/hooks/use-booking";

export default function App() {
  const { takenSlots, book, lookupByPhone } = useBooking();

  return (
    <div className="min-h-screen bg-teal-50/60 text-slate-800 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <SiteHeader />

        <Tabs defaultValue="book" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="book">Book appointment</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="book">
            <BookingForm
              takenSlots={takenSlots}
              onBook={book}
              onLookupPhone={lookupByPhone}
            />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
