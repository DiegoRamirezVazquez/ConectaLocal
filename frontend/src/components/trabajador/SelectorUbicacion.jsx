
import { useEffect, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    useMapEvents,
    useMap
} from 'react-leaflet';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import './selectorUbicacion.css';

const marcadorIcono = new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const SeleccionarPunto = ({ posicion, onChange }) => {
    useMapEvents({
        click(e) {
            onChange({
                lat: e.latlng.lat,
                lng: e.latlng.lng
            });
        }
    });

    if (!posicion) return null;

    return (
        <Marker
            position={[posicion.lat, posicion.lng]}
            icon={marcadorIcono}
        />
    );
};

const CentrarMapa = ({ posicion }) => {
    const mapa = useMap();

    useEffect(() => {
        if (
            Array.isArray(posicion) &&
            posicion.length === 2 &&
            posicion.every(Number.isFinite)
        ) {
            mapa.setView(posicion, 16);
        }
    }, [mapa, posicion]);

    return null;
};

const SelectorUbicacion = ({ ubicacion, onChange }) => {
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState('');

    const lat = Number(ubicacion?.lat);
    const lng = Number(ubicacion?.lng);

    const tieneUbicacion =
        ubicacion?.lat !== '' &&
        ubicacion?.lng !== '' &&
        ubicacion?.lat !== null &&
        ubicacion?.lng !== null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng);

    const posicionInicial = tieneUbicacion
        ? [lat, lng]
        : [20.5235, -100.8157];

    const buscarDireccion = async () => {
        if (!busqueda.trim()) {
            setError('Escribe una dirección para buscar.');
            return;
        }

        try {
            setBuscando(true);
            setError('');

            const url = new URL(
                'https://nominatim.openstreetmap.org/search'
            );

            url.searchParams.set('q', busqueda);
            url.searchParams.set('format', 'json');
            url.searchParams.set('limit', '1');
            url.searchParams.set('countrycodes', 'mx');

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('No fue posible realizar la búsqueda.');
            }

            const resultados = await response.json();

            if (!resultados.length) {
                throw new Error('No encontramos esa dirección.');
            }

            const resultado = resultados[0];

            onChange({
                lat: Number(resultado.lat),
                lng: Number(resultado.lon)
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setBuscando(false);
        }
    };

    const obtenerMiUbicacion = () => {
        setError('');

        if (!navigator.geolocation) {
            setError('Tu navegador no permite obtener la ubicación.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (resultado) => {
                onChange({
                    lat: resultado.coords.latitude,
                    lng: resultado.coords.longitude
                });
            },
            () => {
                setError(
                    'No pudimos obtener tu ubicación. Revisa los permisos del navegador.'
                );
            },
            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );
    };

    return (
        <div className="selector-ubicacion">

            <div className="mapa-busqueda">
                <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            buscarDireccion();
                        }
                    }}
                    placeholder="Busca una dirección, colonia o municipio..."
                />

                <button
                    type="button"
                    onClick={buscarDireccion}
                    disabled={buscando}
                >
                    {buscando ? 'Buscando...' : 'Buscar'}
                </button>
            </div>

            <button
                type="button"
                className="mapa-ubicacion-actual"
                onClick={obtenerMiUbicacion}
            >
                ⌖ Utilizar mi ubicación actual
            </button>

            <div className="mapa-contenedor">
                <MapContainer
                    center={posicionInicial}
                    zoom={13}
                    scrollWheelZoom={true}
                    className="mapa-interactivo"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <SeleccionarPunto
                        posicion={
                            tieneUbicacion
                                ? { lat, lng }
                                : null
                        }
                        onChange={onChange}
                    />

                    <CentrarMapa
                        posicion={
                            tieneUbicacion
                                ? [lat, lng]
                                : null
                        }
                    />
                </MapContainer>
            </div>

            <p className="mapa-instruccion">
                Haz clic sobre el mapa para marcar la ubicación exacta de tu actividad.
            </p>

            {tieneUbicacion ? (
                <div className="mapa-coordenadas">
                    <strong>Ubicación seleccionada</strong>
                    <span>Latitud: {lat.toFixed(6)}</span>
                    <span>Longitud: {lng.toFixed(6)}</span>
                </div>
            ) : (
                <div className="mapa-sin-ubicacion">
                    Selecciona un punto en el mapa para continuar.
                </div>
            )}

            {error && (
                <p className="mapa-error">{error}</p>
            )}

        </div>
    );
};

export default SelectorUbicacion;
