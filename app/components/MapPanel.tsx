'use client'

import { useEffect, useRef, useState } from 'react'

interface MapPanelProps {
    lat?: number
    lng?: number
    formattedAddress?: string
    nearbyLandmarks?: string[]
    locationName?: string
}

export default function MapPanel({
    lat,
    lng,
    formattedAddress,
    nearbyLandmarks = [],
    locationName,
}: MapPanelProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const markerRef = useRef<google.maps.Marker | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const propertyMarkersRef = useRef<google.maps.Marker[]>([])

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // ── Load Google Maps script once ─────────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (window.google?.maps) { setIsLoaded(true); return; }
        const script = document.createElement('script')
        script.id = 'gmap-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => setIsLoaded(true)
        document.head.appendChild(script)
    }, [])

    // ── Initialise or update map when coords arrive ───────────────────────────
    useEffect(() => {
        if (!isLoaded || !mapRef.current || !lat || !lng || !isExpanded) {
            if (!isExpanded) mapInstanceRef.current = null; // Reset on close
            return
        }

        // Re-init if instance was lost or we have a new ref
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                center: { lat, lng },
                zoom: 15,
                disableDefaultUI: true,
                zoomControl: true,
                styles: mapStyles,
            })
        } else {
            mapInstanceRef.current.setCenter({ lat, lng })
        }

        // Main marker
        if (markerRef.current) markerRef.current.setMap(null)
        markerRef.current = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            title: locationName || formattedAddress,
            animation: window.google.maps.Animation.DROP,
        })

        // Dummy properties (Ocean Blue markers)
        propertyMarkersRef.current.forEach(m => m.setMap(null))
        propertyMarkersRef.current = []

        const dummyProps = [
            { lat: lat + 0.0015, lng: lng + 0.002, title: "Skyline Premium", price: "₹50,000 / mo", type: "2BHK Rental" },
            { lat: lat - 0.002, lng: lng + 0.001, title: "Sunrise Studios", price: "₹35 Lakhs", type: "1BHK Sale" },
            { lat: lat + 0.001, lng: lng - 0.003, title: "Imperial Vista", price: "₹1.0 Cr", type: "3BHK Premium" },
            { lat: lat + 0.003, lng: lng + 0.004, title: "Urban Square", price: "₹75,000 / mo", type: "3BHK Rental" },
            { lat: lat - 0.0035, lng: lng - 0.0025, title: "Emerald Heights", price: "₹65 Lakhs", type: "2BHK Sale" },
            { lat: lat + 0.0045, lng: lng - 0.001, title: "The Metro Nest", price: "₹85,000 / mo", type: "Luxury Suite" },
            { lat: lat - 0.001, lng: lng + 0.005, title: "Sapphire Terrace", price: "₹1.2 Lakhs / mo", type: "Penthouse Rent" },
            { lat: lat + 0.0025, lng: lng - 0.0045, title: "Pine Grove", price: "₹95 Lakhs", type: "3BHK Sale" },
            { lat: lat - 0.004, lng: lng + 0.0035, title: "Modern Arch", price: "₹85 Lakhs", type: "2BHK + Study" },
            { lat: lat + 0.0055, lng: lng + 0.002, title: "Central Residency", price: "₹1.0 Cr", type: "3BHK Luxury" },
            { lat: lat - 0.0025, lng: lng - 0.0055, title: "Park View", price: "₹55,000 / mo", type: "1BHK Rental" },
            { lat: lat + 0.0035, lng: lng - 0.003, title: "Skyline Plaza", price: "₹1.5 Lakhs / mo", type: "Commercial Space" },
            { lat: lat - 0.005, lng: lng - 0.001, title: "Heritage Court", price: "₹45 Lakhs", type: "1BHK Sale" }
        ]

        dummyProps.forEach(p => {
            const m = new window.google.maps.Marker({
                position: { lat: p.lat, lng: p.lng },
                map: mapInstanceRef.current,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#3674B5',
                    fillOpacity: 1,
                    strokeWeight: 3,
                    strokeColor: '#ffffff',
                    scale: 12
                }
            })

            const iw = new window.google.maps.InfoWindow({
                content: `
                <div style="color:#1a365d; padding:12px; font-family: 'Inter', sans-serif; min-width: 200px;">
                    <h3 style="margin:0 0 6px 0; font-size:16px; color:#3674B5; font-weight:800;">${p.title}</h3>
                    <p style="margin:0; font-weight:900; font-size:18px; color:#1a365d;">${p.price}</p>
                    <p style="margin:6px 0 10px 0; font-size:13px; color:#578FCA; font-weight:600;">${p.type}</p>
                    <button style="width:100%; padding:8px; background:#D1F8EF; border:none; border-radius:8px; color:#3674B5; font-weight:800; cursor:pointer; font-size:12px;">VIEW LAYOUT</button>
                </div>
            `})

            m.addListener('click', () => {
                propertyMarkersRef.current.forEach(otherM => { /* close others if needed */ })
                iw.open(mapInstanceRef.current, m)
            })
            propertyMarkersRef.current.push(m)
        })
    }, [isLoaded, lat, lng, locationName, formattedAddress, isExpanded])

    // ── Toggle Handler ───────────────────────────────────────────────────────
    const toggleMap = () => setIsExpanded(!isExpanded)

    const triggerStyle: React.CSSProperties = {
        ...styles.trigger,
        ...(isMobile ? { bottom: "100px", left: "20px", width: "56px", height: "56px" } : {}),
        background: isExpanded ? "#3674B5" : "#ffffff",
        borderColor: isExpanded ? "#3674B5" : "rgba(54, 116, 181, 0.2)",
    };

    const modalStyle: React.CSSProperties = {
        ...styles.modal,
        ...(isMobile ? { height: "100vh", borderRadius: "0", maxWidth: "100%" } : {})
    };

    return (
        <>
            {/* Floating Trigger Button */}
            <button
                onClick={toggleMap}
                style={triggerStyle}
                title={isExpanded ? "Close Map" : "View Map Area"}
            >
                <span style={{
                    ...styles.triggerIcon,
                    fontSize: isMobile ? "22px" : "28px",
                    color: isExpanded ? "#ffffff" : "#3674B5",
                    transform: isExpanded ? "rotate(90deg)" : "none"
                }}>{isExpanded ? '✕' : '📍'}</span>
            </button>

            {/* Expanded Map Modal */}
            {isExpanded && (
                <div style={styles.overlay} onClick={toggleMap}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        {!lat || !lng ? (
                            <div style={styles.empty}>
                                <span style={{ fontSize: "64px" }}>📍</span>
                                <h2 style={{ color: "#3674B5", margin: "20px 0 10px" }}>Where shall we look?</h2>
                                <p style={{ color: "#578FCA", fontWeight: 500 }}>Tell PropAi your preferred location to see the area map.</p>
                            </div>
                        ) : (
                            <div style={styles.container}>
                                <div ref={mapRef} style={styles.canvas} />
                                <div style={{ ...styles.footer, padding: isMobile ? "20px" : "32px", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "16px" : "0" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span style={{ fontSize: "20px" }}>🏙️</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: "12px", color: "#578FCA", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Currently Exploring</p>
                                            <p style={{ margin: 0, fontSize: "20px", color: "#3674B5", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{locationName || formattedAddress}</p>
                                        </div>
                                    </div>
                                    <div style={styles.landmarkList}>
                                        {nearbyLandmarks.map((l, i) => (
                                            <span key={i} style={styles.tag}>{l}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <button style={{ ...styles.closeBtn, top: isMobile ? "20px" : "24px", right: isMobile ? "20px" : "24px" }} onClick={toggleMap}>✕ CLOSE</button>
                    </div>
                </div>
            )}
        </>
    )
}

const styles: Record<string, React.CSSProperties> = {
    trigger: {
        position: "absolute",
        bottom: "32px",
        left: "32px",
        width: "72px",
        height: "72px",
        borderRadius: "24px",
        border: "1px solid",
        boxShadow: "0 12px 40px rgba(54, 116, 181, 0.2)",
        cursor: "pointer",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    },
    triggerIcon: {
        fontSize: "28px",
        transition: "all 0.4s",
    },
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(26, 54, 93, 0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        animation: "fade-up 0.4s ease-out",
    },
    modal: {
        background: "#ffffff",
        width: "100%",
        maxWidth: "1000px",
        height: "85vh",
        borderRadius: "40px",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 40px 120px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(255,255,255,0.8)",
    },
    container: { height: "100%", display: "flex", flexDirection: "column" },
    canvas: { flex: 1, width: "100%" },
    footer: {
        padding: "32px",
        background: "#ffffff",
        borderTop: "1px solid rgba(54, 116, 181, 0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    },
    landmarkList: { display: "flex", flexWrap: "wrap", gap: "8px" },
    tag: {
        fontSize: "11px",
        fontWeight: 800,
        color: "#3674B5",
        background: "#D1F8EF",
        padding: "6px 14px",
        borderRadius: "20px",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
    },
    empty: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px" },
    closeBtn: {
        position: "absolute",
        top: "24px",
        right: "24px",
        padding: "10px 20px",
        background: "rgba(26, 54, 93, 0.8)",
        color: "white",
        border: "none",
        borderRadius: "15px",
        fontWeight: 800,
        cursor: "pointer",
        zIndex: 10,
        backdropFilter: "blur(8px)",
        fontSize: "12px",
        letterSpacing: "0.05em"
    },
}

// ── Custom map styles (Luxury Light Theme) ────────────────────────
const mapStyles: google.maps.MapTypeStyle[] = [
    { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
    { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
    { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
    { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#A1E3F9" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3674B5" }] }
]