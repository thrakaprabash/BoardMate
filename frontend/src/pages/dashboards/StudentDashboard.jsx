import React, { useEffect, useMemo, useState } from 'react';
import { 
  Building2, 
  Bed, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Star,
  MessageSquare,
  Bell,
  Search,
  MapPin,
  Users,
  Wifi,
  Car,
  Utensils,
  Shield,
  Filter,
  ArrowRight,
  ArrowLeft,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Clock
} from 'lucide-react';

// Mock API service
const api = {
  get: async (url, config) => {
    // Mock data based on URL
    if (url === '/hostels') {
      return {
        data: [
          { 
            _id: '1', 
            name: 'Grand View Hostel', 
            location: 'Colombo 03',
            rating: 4.5,
            amenities: ['wifi', 'parking', 'meals', 'security'],
            price_range: '15000-25000',
            image: 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg'
          },
          { 
            _id: '2', 
            name: 'City Center Hostel', 
            location: 'Colombo 01',
            rating: 4.2,
            amenities: ['wifi', 'meals', 'security'],
            price_range: '12000-20000',
            image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg'
          },
          { 
            _id: '3', 
            name: 'Campus View Hostel', 
            location: 'Moratuwa',
            rating: 4.8,
            amenities: ['wifi', 'parking', 'meals', 'security', 'gym'],
            price_range: '18000-28000',
            image: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'
          }
        ]
      };
    }
    
    if (url.includes('/rooms')) {
      const hostelId = url.split('/')[2] || '1';
      return {
        data: [
          { 
            _id: `r1_${hostelId}`, 
            name: 'Single Room A101', 
            type: 'Single',
            capacity: 1,
            rent: 18000,
            availability_status: true,
            amenities: ['AC', 'Attached Bathroom', 'Study Table'],
            description: 'Comfortable single room with all basic amenities'
          },
          { 
            _id: `r2_${hostelId}`, 
            name: 'Double Room B201', 
            type: 'Double',
            capacity: 2,
            rent: 15000,
            availability_status: true,
            amenities: ['AC', 'Shared Bathroom', 'Study Tables'],
            description: 'Spacious double room perfect for sharing'
          },
          { 
            _id: `r3_${hostelId}`, 
            name: 'Triple Room C301', 
            type: 'Triple',
            capacity: 3,
            rent: 12000,
            availability_status: false,
            amenities: ['Fan', 'Shared Bathroom', 'Study Tables'],
            description: 'Budget-friendly triple occupancy room'
          }
        ]
      };
    }
    
    if (url === '/bookings') {
      return {
        data: [
          {
            _id: 'b1',
            room_id: 'r1_1',
            hostel_id: '1',
            start_date: '2025-01-15',
            end_date: '2025-06-15',
            status: 'confirmed',
            payment_status: 'pending',
            amount: 18000
          },
          {
            _id: 'b2',
            room_id: 'r2_2',
            hostel_id: '2',
            start_date: '2025-02-01',
            end_date: '2025-07-01',
            status: 'pending',
            payment_status: 'paid',
            amount: 15000
          }
        ]
      };
    }
    
    if (url === '/finance') {
      return {
        data: [
          {
            _id: 'p1',
            booking_id: 'b1',
            amount: 18000,
            method: 'card',
            status: 'paid',
            date: '2025-01-01',
            can_cancel: true
          },
          {
            _id: 'p2',
            booking_id: 'b2',
            amount: 15000,
            method: 'bank',
            status: 'pending',
            date: '2025-01-02',
            can_cancel: false
          }
        ]
      };
    }
    
    return { data: [] };
  },
  
  post: async (url, data) => {
    console.log('POST', url, data);
    return { data: { success: true, _id: Date.now().toString() } };
  },
  
  patch: async (url, data) => {
    console.log('PATCH', url, data);
    return { data: { success: true } };
  }
};

// Helper functions
const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "--");
const fmtAmt = (n) => (n == null ? "--" : `LKR ${Number(n).toLocaleString()}`);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (n) => { 
  const x = new Date(); 
  x.setDate(x.getDate() + n); 
  return x.toISOString().slice(0, 10);
};

// Mock user context
const useAuth = () => ({
  user: { _id: 'user123', name: 'John Doe', email: 'john@example.com' }
});

// Components
function StatCard({ title, value, icon: Icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400'
  };

  return (
    <div className={`rounded-2xl border p-6 ${colorClasses[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {Icon && <Icon className="h-8 w-8 opacity-60" />}
      </div>
    </div>
  );
}

function Modal({ open, title, onClose, children, size = 'default' }) {
  if (!open) return null;
  
  const sizeClasses = {
    default: 'max-w-lg',
    large: 'max-w-4xl',
    small: 'max-w-md'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`w-full ${sizeClasses[size]} bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Button({ variant = 'primary', size = 'default', children, className = '', ...props }) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/20',
    outline: 'border-white/30 hover:bg-white/10 text-white bg-transparent',
    success: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button 
      className={`border rounded-xl font-medium transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function HostelCard({ hostel, onSelect, selected = false }) {
  const amenityIcons = {
    wifi: Wifi,
    parking: Car,
    meals: Utensils,
    security: Shield
  };

  return (
    <div 
      onClick={() => onSelect(hostel)}
      className={`rounded-2xl border backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-105 ${
        selected 
          ? 'border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/30' 
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      <div className="aspect-video rounded-t-2xl overflow-hidden">
        <img 
          src={hostel.image} 
          alt={hostel.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{hostel.name}</h3>
          <div className="flex items-center gap-1 text-yellow-400">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-sm">{hostel.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-white/70 mb-3">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{hostel.location}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {hostel.amenities.slice(0, 4).map((amenity) => {
            const Icon = amenityIcons[amenity] || Shield;
            return (
              <div key={amenity} className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg">
                <Icon className="h-3 w-3" />
                <span className="text-xs capitalize">{amenity}</span>
              </div>
            );
          })}
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-green-400">{hostel.price_range}</span>
          <span className="text-sm text-white/70 ml-1">LKR/month</span>
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room, onSelect, onBook }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{room.name}</h3>
            <p className="text-white/70 text-sm">{room.description}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            room.availability_status 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {room.availability_status ? 'Available' : 'Occupied'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white/70">Capacity: {room.capacity}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white/70">{room.type}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {room.amenities.map((amenity, idx) => (
            <span key={idx} className="px-2 py-1 bg-white/10 rounded text-xs">
              {amenity}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-400">LKR {room.rent.toLocaleString()}</span>
            <span className="text-sm text-white/70 ml-1">/month</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onSelect(room)}>
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            {room.availability_status && (
              <Button size="sm" onClick={() => onBook(room)}>
                Book Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // Data states
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // UI states
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  
  // Form states
  const [bookingForm, setBookingForm] = useState({
    start_date: todayISO(),
    end_date: addDaysISO(30),
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'card',
    booking_id: ''
  });
  
  // Messages
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [hostelsRes, bookingsRes, paymentsRes] = await Promise.all([
          api.get('/hostels'),
          api.get('/bookings'),
          api.get('/finance')
        ]);
        
        setHostels(hostelsRes.data || []);
        setBookings(bookingsRes.data || []);
        setPayments(paymentsRes.data || []);
      } catch (error) {
        showMessage('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Load rooms when hostel is selected
  useEffect(() => {
    if (selectedHostel) {
      const loadRooms = async () => {
        setLoading(true);
        try {
          const roomsRes = await api.get(`/hostels/${selectedHostel._id}/rooms`);
          setRooms(roomsRes.data || []);
        } catch (error) {
          showMessage('Failed to load rooms', 'error');
        } finally {
          setLoading(false);
        }
      };
      
      loadRooms();
    }
  }, [selectedHostel]);

  // Stats
  const stats = useMemo(() => {
    const upcoming = bookings.filter(b => 
      ['pending', 'confirmed'].includes(b.status)
    ).length;
    
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      upcoming,
      totalPaid,
      pending,
      totalBookings: bookings.length
    };
  }, [bookings, payments]);

  // Handlers
  const handleHostelSelect = (hostel) => {
    setSelectedHostel(hostel);
    setCurrentStep(2);
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setShowRoomDetails(true);
  };

  const handleBookRoom = (room) => {
    setSelectedRoom(room);
    setCurrentStep(3);
  };

  const handleStartBooking = () => {
    setCurrentStep(1);
    setSelectedHostel(null);
    setSelectedRoom(null);
    setShowBookingWizard(true);
  };

  const handleCreateBooking = async () => {
    if (!selectedHostel || !selectedRoom) {
      showMessage('Please select hostel and room', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await api.post('/bookings', {
        hostel_id: selectedHostel._id,
        room_id: selectedRoom._id,
        user_id: user._id,
        ...bookingForm
      });
      
      showMessage('Booking created successfully!');
      setShowBookingWizard(false);
      // Refresh bookings
      const bookingsRes = await api.get('/bookings');
      setBookings(bookingsRes.data || []);
    } catch (error) {
      showMessage('Failed to create booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      await api.post('/finance', {
        ...paymentForm,
        user_id: user._id,
        status: 'paid',
        date: new Date().toISOString()
      });
      
      showMessage('Payment processed successfully!');
      setShowPaymentModal(false);
      // Refresh payments
      const paymentsRes = await api.get('/finance');
      setPayments(paymentsRes.data || []);
    } catch (error) {
      showMessage('Payment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async (paymentId) => {
    if (!confirm('Are you sure you want to cancel this payment?')) return;
    
    try {
      setLoading(true);
      await api.patch(`/finance/${paymentId}/cancel`);
      showMessage('Payment cancelled successfully!');
      // Refresh payments
      const paymentsRes = await api.get('/finance');
      setPayments(paymentsRes.data || []);
    } catch (error) {
      showMessage('Failed to cancel payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (booking) => {
    setPaymentForm({
      amount: booking.amount || '',
      method: 'card',
      booking_id: booking._id
    });
    setShowPaymentModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Student Dashboard</h1>
            <p className="text-white/70">Welcome back, {user.name}!</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleStartBooking}>
              <Building2 className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            <Button variant="outline" onClick={() => setShowPaymentHistory(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Payment History
            </Button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'error' 
              ? 'bg-red-500/20 border border-red-500/50 text-red-200' 
              : 'bg-green-500/20 border border-green-500/50 text-green-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Active Bookings" 
            value={stats.upcoming} 
            icon={Building2}
            color="blue" 
          />
          <StatCard 
            title="Total Bookings" 
            value={stats.totalBookings} 
            icon={Calendar}
            color="purple" 
          />
          <StatCard 
            title="Total Paid" 
            value={fmtAmt(stats.totalPaid)} 
            icon={CheckCircle}
            color="green" 
          />
          <StatCard 
            title="Pending Payments" 
            value={fmtAmt(stats.pending)} 
            icon={Clock}
            color="orange" 
          />
        </div>

        {/* Recent Bookings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Bookings</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70 mb-4">No bookings yet</p>
              <Button onClick={handleStartBooking}>Create Your First Booking</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.slice(0, 3).map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-400' :
                      booking.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <h3 className="text-white font-medium">Booking #{booking._id.slice(-6)}</h3>
                      <p className="text-white/70 text-sm">
                        {fmtD(booking.start_date)} - {fmtD(booking.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                    {booking.payment_status !== 'paid' && (
                      <Button size="sm" onClick={() => openPaymentModal(booking)}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Payments</h2>
            <Button variant="outline" size="sm" onClick={() => setShowPaymentHistory(true)}>
              View All
            </Button>
          </div>
          
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-8 w-8 text-white/30 mx-auto mb-3" />
              <p className="text-white/70">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.slice(0, 5).map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">{fmtAmt(payment.amount)}</p>
                      <p className="text-white/70 text-sm">{fmtD(payment.date)} • {payment.method}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      payment.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {payment.status}
                    </span>
                    {payment.can_cancel && payment.status === 'paid' && (
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleCancelPayment(payment._id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Wizard Modal */}
      <Modal 
        open={showBookingWizard} 
        title={`Book a Room - Step ${currentStep} of 3`}
        onClose={() => setShowBookingWizard(false)}
        size="large"
      >
        <div className="mb-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center w-full max-w-md">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/30 text-white/30'
              }`}>
                1
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-white/30'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/30 text-white/30'
              }`}>
                2
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-white/30'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= 3 ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/30 text-white/30'
              }`}>
                3
              </div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-white/70 mt-2 max-w-md mx-auto">
            <span>Select Hostel</span>
            <span>Choose Room</span>
            <span>Book & Pay</span>
          </div>
        </div>

        {/* Step 1: Select Hostel */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Select a Hostel</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto">
              {hostels.map((hostel) => (
                <HostelCard 
                  key={hostel._id}
                  hostel={hostel}
                  selected={selectedHostel?._id === hostel._id}
                  onSelect={handleHostelSelect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Room */}
        {currentStep === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Choose a Room</h3>
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Hostels
              </Button>
            </div>
            <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="font-medium text-white">{selectedHostel?.name}</h4>
              <p className="text-white/70 text-sm">{selectedHostel?.location}</p>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {rooms.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  onSelect={handleRoomSelect}
                  onBook={handleBookRoom}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Booking Details */}
        {currentStep === 3 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Booking Details</h3>
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Rooms
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Selected Items Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="font-medium text-white mb-2">Selected Hostel</h4>
                  <p className="text-white/70">{selectedHostel?.name}</p>
                  <p className="text-white/60 text-sm">{selectedHostel?.location}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="font-medium text-white mb-2">Selected Room</h4>
                  <p className="text-white/70">{selectedRoom?.name}</p>
                  <p className="text-green-400 font-bold">LKR {selectedRoom?.rent?.toLocaleString()}/month</p>
                </div>
              </div>

              {/* Booking Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={bookingForm.start_date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">End Date</label>
                  <input
                    type="date"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={bookingForm.end_date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button variant="outline" onClick={() => setShowBookingWizard(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBooking} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Booking'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal 
        open={showPaymentModal} 
        title="Process Payment"
        onClose={() => setShowPaymentModal(false)}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Amount (LKR)</label>
            <input
              type="number"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">Payment Method</label>
            <select
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={paymentForm.method}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
            >
              <option value="card" className="bg-gray-900">Credit Card</option>
              <option value="bank" className="bg-gray-900">Bank Transfer</option>
              <option value="cash" className="bg-gray-900">Cash</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={loading}>
              {loading ? 'Processing...' : 'Process Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Room Details Modal */}
      <Modal 
        open={showRoomDetails} 
        title="Room Details"
        onClose={() => setShowRoomDetails(false)}
      >
        {selectedRoom && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">{selectedRoom.name}</h3>
              <p className="text-white/70">{selectedRoom.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <h4 className="font-medium text-white mb-1">Type</h4>
                <p className="text-white/70">{selectedRoom.type}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <h4 className="font-medium text-white mb-1">Capacity</h4>
                <p className="text-white/70">{selectedRoom.capacity} person(s)</p>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 rounded-xl">
              <h4 className="font-medium text-white mb-3">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRoom.amenities?.map((amenity, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white/10 rounded-lg text-sm text-white">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <p className="text-2xl font-bold text-green-400">LKR {selectedRoom.rent?.toLocaleString()}</p>
              <p className="text-green-300 text-sm">per month</p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRoomDetails(false)}>
                Close
              </Button>
              {selectedRoom.availability_status && (
                <Button onClick={() => {
                  setShowRoomDetails(false);
                  handleBookRoom(selectedRoom);
                  setShowBookingWizard(true);
                }}>
                  Book This Room
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment History Modal */}
      <Modal 
        open={showPaymentHistory} 
        title="Payment History"
        onClose={() => setShowPaymentHistory(false)}
        size="large"
      >
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">No payment history available</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div key={payment._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    payment.status === 'paid' ? 'bg-green-400' :
                    payment.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-white font-medium">{fmtAmt(payment.amount)}</p>
                    <p className="text-white/70 text-sm">
                      {fmtD(payment.date)} • {payment.method} • {payment.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {payment.can_cancel && payment.status === 'paid' && (
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => handleCancelPayment(payment._id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel Payment
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}