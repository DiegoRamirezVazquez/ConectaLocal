import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { obtenerCategorias } from '../../services/trabajadorService';
import { enviarFormularioRequest } from '../../services/authService';
import SelectorUbicacion from '../../components/trabajador/SelectorUbicacion';

import './registrarActividad.css';

const RegistrarActividad = () => {
    const navigate = useNavigate();

    // Estados del formulario.
    const [tipoRegistro, setTipoRegistro] = useState('negocio');
    const [categorias, setCategorias] = useState([]);
    const [fotografias, setFotografias] = useState([]);

    const [cargandoCategorias, setCargandoCategorias] = useState(true);
    const [enviando, setEnviando] = useState(false);

    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    // Datos del registro.
    const [formulario, setFormulario] = useState({
        nombre_comercial: '',
        categoria_id: '',
        descripcion: '',
        direccion: '',
        zona_cobertura: '',
        telefono_contacto: '',
        whatsapp: '',
        email_contacto: '',
        sitio_web: '',
        lat: '',
        lng: ''
    });

    // Consultar categorías disponibles.
    useEffect(() => {
        const cargarCategorias = async () => {
            try {
                const resultado = await obtenerCategorias();
                setCategorias(resultado);
            } catch (err) {
                setError(err.message);
            } finally {
                setCargandoCategorias(false);
            }
        };

        cargarCategorias();
    }, []);

    // Manejar cambios en los campos.
    const manejarCambio = (e) => {
        const { name, value } = e.target;

        setFormulario((actual) => ({
            ...actual,
            [name]: value
        }));
    };

    // Cambiar modalidad de registro.
    const cambiarTipoRegistro = (tipo) => {
        setTipoRegistro(tipo);
        setError('');

        setFormulario((actual) => ({
            ...actual,
            direccion: '',
            zona_cobertura: ''
        }));
    };

    // Recibir ubicación seleccionada en el mapa.
    const manejarUbicacion = ({ lat, lng }) => {
        setFormulario((actual) => ({
            ...actual,
            lat: String(lat),
            lng: String(lng)
        }));

        setError('');
    };

    // Validar fotografías.
    const manejarFotografias = (e) => {
        const archivos = Array.from(e.target.files || []);

        setError('');

        if (archivos.length > 5) {
            setFotografias([]);
            e.target.value = '';

            setError('Solo puedes seleccionar hasta cinco fotografías.');
            return;
        }

        const formatosPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        const invalida = archivos.find(
            (archivo) => !formatosPermitidos.includes(archivo.type)
        );

        if (invalida) {
            setFotografias([]);
            e.target.value = '';

            setError('Solo se permiten imágenes JPG, PNG o WEBP.');
            return;
        }

        const excedida = archivos.find(
            (archivo) => archivo.size > 5 * 1024 * 1024
        );

        if (excedida) {
            setFotografias([]);
            e.target.value = '';

            setError('Cada fotografía debe pesar máximo 5 MB.');
            return;
        }

        setFotografias(archivos);
    };

    // Enviar solicitud al backend.
    const manejarEnvio = async (e) => {
        e.preventDefault();

        if (enviando) return;

        setError('');
        setMensaje('');

        // Validar ubicación.
        if (!formulario.lat || !formulario.lng) {
            setError('Debes seleccionar la ubicación en el mapa.');
            return;
        }

        const lat = Number(formulario.lat);
        const lng = Number(formulario.lng);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            setError('Las coordenadas seleccionadas no son válidas.');
            return;
        }

        // Validar medios de contacto.
        const tieneContacto = [
            formulario.telefono_contacto,
            formulario.whatsapp,
            formulario.email_contacto,
            formulario.sitio_web
        ].some((dato) => dato.trim() !== '');

        if (!tieneContacto) {
            setError('Debes proporcionar al menos un medio de contacto.');
            return;
        }

        // Crear formulario multipart.
        const datos = new FormData();

        datos.append('tipo_registro', tipoRegistro);

        Object.entries(formulario).forEach(([campo, valor]) => {
            datos.append(campo, valor);
        });

        fotografias.forEach((archivo) => {
            datos.append('fotografias', archivo);
        });

        try {
            setEnviando(true);

            await enviarFormularioRequest(
                '/solicitudes-trabajador/enviar',
                datos
            );

            setMensaje(
                '¡Tu solicitud fue enviada correctamente para revisión!'
            );

            setTimeout(() => {
                navigate('/trabajador');
            }, 1800);

        } catch (err) {
            setError(
                err.message || 'No fue posible enviar la solicitud.'
            );
        } finally {
            setEnviando(false);
        }
    };

    return (
        <main className="registro-actividad">

            {/* ENCABEZADO */}
            <header className="registro-header">

                <button
                    type="button"
                    className="registro-volver"
                    onClick={() => navigate('/trabajador')}
                >
                    ← Volver al panel
                </button>

                <span>CONECTALOCAL</span>

            </header>

            <section className="registro-contenedor">

                {/* INTRODUCCIÓN */}
                <div className="registro-introduccion">

                    <span>CRECE CON TU COMUNIDAD</span>

                    <h1>Registra tu actividad</h1>

                    <p>
                        Comparte información sobre tu negocio o los servicios
                        que ofreces para que más personas puedan encontrarte.
                    </p>

                </div>

                <form
                    className="registro-formulario"
                    onSubmit={manejarEnvio}
                >

                    {/* 01. TIPO DE REGISTRO */}
                    <section className="form-seccion">

                        <div className="form-titulo">
                            <span>01</span>

                            <div>
                                <h2>Tipo de registro</h2>
                                <p>Selecciona qué deseas registrar.</p>
                            </div>
                        </div>

                        <div className="tipo-registro-opciones">

                            <button
                                type="button"
                                className={
                                    tipoRegistro === 'negocio'
                                        ? 'tipo-opcion seleccionado'
                                        : 'tipo-opcion'
                                }
                                onClick={() => cambiarTipoRegistro('negocio')}
                            >
                                <span>⌂</span>
                                <strong>Negocio</strong>
                                <small>Establecimiento físico</small>
                            </button>

                            <button
                                type="button"
                                className={
                                    tipoRegistro === 'independiente'
                                        ? 'tipo-opcion seleccionado'
                                        : 'tipo-opcion'
                                }
                                onClick={() => cambiarTipoRegistro('independiente')}
                            >
                                <span>✧</span>
                                <strong>Actividad independiente</strong>
                                <small>Servicios por cuenta propia</small>
                            </button>

                        </div>

                    </section>

                    {/* 02. INFORMACIÓN GENERAL */}
                    <section className="form-seccion">

                        <div className="form-titulo">
                            <span>02</span>

                            <div>
                                <h2>Información general</h2>
                                <p>Cuéntanos sobre tu actividad.</p>
                            </div>
                        </div>

                        <div className="campo-grupo">

                            <label>Nombre comercial *</label>

                            <input
                                type="text"
                                name="nombre_comercial"
                                value={formulario.nombre_comercial}
                                onChange={manejarCambio}
                                placeholder="Ej. Taller Mecánico Ramírez"
                                maxLength={150}
                                required
                            />

                        </div>

                        <div className="campo-grupo">

                            <label>Categoría *</label>

                            <select
                                name="categoria_id"
                                value={formulario.categoria_id}
                                onChange={manejarCambio}
                                required
                                disabled={cargandoCategorias}
                            >

                                <option value="">
                                    {cargandoCategorias
                                        ? 'Cargando categorías...'
                                        : 'Selecciona una categoría'}
                                </option>

                                {categorias.map((categoria) => (
                                    <option
                                        key={categoria.id}
                                        value={categoria.id}
                                    >
                                        {categoria.nombre}
                                    </option>
                                ))}

                            </select>

                            {!cargandoCategorias &&
                                categorias.length === 0 && (
                                    <small>
                                        No hay categorías disponibles.
                                    </small>
                                )}

                        </div>

                        <div className="campo-grupo">

                            <label>Descripción *</label>

                            <textarea
                                name="descripcion"
                                value={formulario.descripcion}
                                onChange={manejarCambio}
                                placeholder="Describe los productos o servicios que ofreces..."
                                rows="5"
                                maxLength={2000}
                                required
                            />

                        </div>

                    </section>

                    {/* 03. UBICACIÓN */}
                    <section className="form-seccion">

                        <div className="form-titulo">
                            <span>03</span>

                            <div>
                                <h2>Ubicación</h2>
                                <p>Indica dónde pueden encontrarte.</p>
                            </div>
                        </div>

                        {tipoRegistro === 'negocio' ? (

                            <div className="campo-grupo">

                                <label>
                                    Dirección del establecimiento *
                                </label>

                                <textarea
                                    name="direccion"
                                    value={formulario.direccion}
                                    onChange={manejarCambio}
                                    placeholder="Calle, número, colonia, municipio..."
                                    rows="3"
                                    required
                                />

                            </div>

                        ) : (

                            <div className="campo-grupo">

                                <label>Zona de cobertura *</label>

                                <input
                                    type="text"
                                    name="zona_cobertura"
                                    value={formulario.zona_cobertura}
                                    onChange={manejarCambio}
                                    placeholder="Ej. Celaya y municipios cercanos"
                                    required
                                />

                            </div>

                        )}

                        <div className="campo-grupo">

                            <label>Selecciona tu ubicación en el mapa *</label>

                            <SelectorUbicacion
                                ubicacion={{
                                    lat: formulario.lat,
                                    lng: formulario.lng
                                }}
                                onChange={manejarUbicacion}
                            />

                        </div>

                    </section>

                    {/* 04. CONTACTO */}
                    <section className="form-seccion">

                        <div className="form-titulo">
                            <span>04</span>

                            <div>
                                <h2>Información de contacto</h2>
                                <p>Agrega al menos un medio de contacto.</p>
                            </div>
                        </div>

                        <div className="form-grid">

                            <div className="campo-grupo">

                                <label>Teléfono</label>

                                <input
                                    type="tel"
                                    name="telefono_contacto"
                                    value={formulario.telefono_contacto}
                                    onChange={manejarCambio}
                                    placeholder="Número telefónico"
                                />

                            </div>

                            <div className="campo-grupo">

                                <label>WhatsApp</label>

                                <input
                                    type="tel"
                                    name="whatsapp"
                                    value={formulario.whatsapp}
                                    onChange={manejarCambio}
                                    placeholder="Número de WhatsApp"
                                />

                            </div>

                            <div className="campo-grupo">

                                <label>Correo electrónico</label>

                                <input
                                    type="email"
                                    name="email_contacto"
                                    value={formulario.email_contacto}
                                    onChange={manejarCambio}
                                    placeholder="correo@ejemplo.com"
                                />

                            </div>

                            <div className="campo-grupo">

                                <label>Sitio web</label>

                                <input
                                    type="url"
                                    name="sitio_web"
                                    value={formulario.sitio_web}
                                    onChange={manejarCambio}
                                    placeholder="https://ejemplo.com"
                                />

                            </div>

                        </div>

                    </section>

                    {/* 05. FOTOGRAFÍAS */}
                    <section className="form-seccion">

                        <div className="form-titulo">
                            <span>05</span>

                            <div>
                                <h2>Fotografías</h2>
                                <p>
                                    Agrega hasta cinco imágenes de tu actividad.
                                </p>
                            </div>
                        </div>

                        <div className="campo-grupo">

                            <label>Seleccionar fotografías</label>

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={manejarFotografias}
                            />

                            <small className="ayuda-campo">
                                Formatos JPG, PNG o WEBP. Máximo 5 MB por imagen.
                            </small>

                            <span className="contador-fotos">
                                {fotografias.length} de 5 fotografías seleccionadas
                            </span>

                        </div>

                        {fotografias.length > 0 && (

                            <div className="lista-fotografias">

                                {fotografias.map((archivo, indice) => (
                                    <div key={`${archivo.name}-${indice}`}>
                                        <span>{archivo.name}</span>
                                        <small>
                                            {(archivo.size / 1024 / 1024).toFixed(2)} MB
                                        </small>
                                    </div>
                                ))}

                            </div>

                        )}

                    </section>

                    {/* MENSAJES */}
                    {error && (
                        <div className="registro-alerta error">
                            {error}
                        </div>
                    )}

                    {mensaje && (
                        <div className="registro-alerta exito">
                            {mensaje}
                        </div>
                    )}

                    {/* AVISO */}
                    <div className="registro-aviso">

                        <strong>Importante:</strong>

                        <p>
                            Al enviar tu registro, será enviado a revisión
                            administrativa. Tu actividad no será publicada
                            hasta que sea aprobada.
                        </p>

                    </div>

                    {/* BOTÓN DE ENVÍO */}
                    <button
                        type="submit"
                        className="registro-enviar"
                        disabled={
                            enviando ||
                            cargandoCategorias ||
                            categorias.length === 0
                        }
                    >
                        {enviando
                            ? 'Enviando solicitud...'
                            : 'Enviar solicitud para revisión →'}
                    </button>

                </form>

            </section>

        </main>
    );
};

export default RegistrarActividad;
