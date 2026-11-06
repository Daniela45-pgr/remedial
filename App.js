import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, FlatList, Alert, SafeAreaView, Modal } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, collection, addDoc, getDocsFromServer, deleteDoc, updateDoc, doc,
  serverTimestamp,
} from 'firebase/firestore';

// <-- Pega aquí TU firebaseConfig (el mismo que ya tenías)
const firebaseConfig = {
  apiKey: "AIzaSyB58PTeeTbmYHBYnZpXlnLK2j3FeYa6ils",
  authDomain: "remedial-8508d.firebaseapp.com",
  projectId: "remedial-8508d",
  storageBucket: "remedial-8508d.firebasestorage.app",
  messagingSenderId: "53075087125",
  appId: "1:53075087125:web:9c4d296034a843711c231c"
};

const app = initializeApp(firebaseConfig);
// experimentalForceLongPolling: necesario en React Native para que
// Firestore sí se comunique con el servidor (si no, solo guarda en memoria)
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const coleccion = collection(db, 'estudiantes');
 
export default function App() {
  // Pantallas: 'registro' | 'panel' | 'editar'
  const [pantalla, setPantalla] = useState('registro');
  const [lista, setLista] = useState([]);
 
  // Campos del formulario (se usan para registrar y para editar)
  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [carrera, setCarrera] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null); // estudiante a confirmar
  const [mensaje, setMensaje] = useState('');
 
  const limpiar = () => { setNombre(''); setMatricula(''); setCarrera(''); setEditandoId(null); };
 
  const cargar = async () => {
    try {
      // Lee directo del servidor (no de la memoria del teléfono)
      const snap = await getDocsFromServer(coleccion);
      const datos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Ordena aquí; los que no tengan 'creado' (agregados a mano) van al final
      datos.sort((a, b) => (b.creado?.seconds || 0) - (a.creado?.seconds || 0));
      setLista(datos);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };
 
  // CREATE
  const guardar = async () => {
    if (!nombre || !matricula) return Alert.alert('Aviso', 'Nombre y matrícula son obligatorios');
    try {
      await addDoc(coleccion, { nombre, matricula, carrera, creado: serverTimestamp() });
      limpiar();
      await cargar();
      Alert.alert('Listo', 'Estudiante registrado');
      setPantalla('panel');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };
 
  // Abrir pantalla de edición con los datos del estudiante
  const abrirEditar = (item) => {
    setEditandoId(item.id);
    setNombre(item.nombre);
    setMatricula(item.matricula);
    setCarrera(item.carrera || '');
    setPantalla('editar');
  };
 
  // UPDATE
  const actualizar = async () => {
    if (!nombre || !matricula) return Alert.alert('Aviso', 'Nombre y matrícula son obligatorios');
    try {
      await updateDoc(doc(db, 'estudiantes', editandoId), { nombre, matricula, carrera });
      limpiar();
      await cargar();
      Alert.alert('Listo', 'Estudiante actualizado');
      setPantalla('panel');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };
 
  // DELETE: primero abre la ventana de confirmación
  const eliminar = (item) => setPorEliminar(item);
 
  // DELETE: se ejecuta al confirmar
  const confirmarEliminar = async () => {
    const item = porEliminar;
    setPorEliminar(null);
    try {
      await deleteDoc(doc(db, 'estudiantes', item.id));
      limpiar();
      setPantalla('panel');
      await cargar();
      setMensaje(`Se eliminó a ${item.nombre}`);
      setTimeout(() => setMensaje(''), 2500);
    } catch (e) {
      setMensaje('Error al eliminar: ' + e.message);
    }
  };
 
  // Ventana de confirmación (se muestra en cualquier pantalla)
  const VentanaEliminar = () => (
    <Modal visible={!!porEliminar} transparent animationType="fade" onRequestClose={() => setPorEliminar(null)}>
      <View style={s.fondoModal}>
        <View style={s.cajaModal}>
          <Text style={s.tituloModal}>Eliminar estudiante</Text>
          <Text style={{ marginBottom: 16 }}>¿Seguro que deseas eliminar a {porEliminar?.nombre}?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <TouchableOpacity style={s.chipGris} onPress={() => setPorEliminar(null)}>
              <Text style={s.chipTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.chipRojo} onPress={confirmarEliminar}>
              <Text style={s.chipTxt}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
 
  useEffect(() => { cargar(); }, []);
 
  // ---------- Formulario (registro y edición) ----------
  const Formulario = () => (
    <>
      <TextInput style={s.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput style={s.input} placeholder="Matrícula" value={matricula} onChangeText={setMatricula} />
      <TextInput style={s.input} placeholder="Carrera" value={carrera} onChangeText={setCarrera} />
    </>
  );
 
  // ---------- PANTALLA: REGISTRO ----------
  if (pantalla === 'registro') {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.titulo}>Registro de Estudiantes</Text>
        {Formulario()}
        <TouchableOpacity style={s.boton} onPress={guardar}>
          <Text style={s.botonTxt}>Guardar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.botonSec} onPress={() => { cargar(); setPantalla('panel'); }}>
          <Text style={s.botonSecTxt}>Ver panel de estudiantes</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
 
  // ---------- PANTALLA: EDITAR ----------
  if (pantalla === 'editar') {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.titulo}>Editar Estudiante</Text>
        {Formulario()}
        <TouchableOpacity style={s.boton} onPress={actualizar}>
          <Text style={s.botonTxt}>Guardar cambios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.botonRojo} onPress={() => eliminar({ id: editandoId, nombre })}>
          <Text style={s.botonTxt}>Eliminar estudiante</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.botonSec} onPress={() => { limpiar(); setPantalla('panel'); }}>
          <Text style={s.botonSecTxt}>Cancelar</Text>
        </TouchableOpacity>
        {VentanaEliminar()}
      </SafeAreaView>
    );
  }
 
  // ---------- PANTALLA: PANEL ----------
  return (
    <SafeAreaView style={s.container}>
      <Text style={s.titulo}>Panel de Estudiantes</Text>
      <Text style={s.contador}>Total: {lista.length}</Text>
      {mensaje ? <Text style={s.mensaje}>{mensaje}</Text> : null}
 
      <FlatList
        data={lista}
        keyExtractor={(item) => item.id}
        onRefresh={cargar}
        refreshing={false}
        ListEmptyComponent={<Text style={s.vacio}>Sin registros</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{item.nombre}</Text>
              <Text style={s.detalle}>Matrícula: {item.matricula}</Text>
              <Text style={s.detalle}>Carrera: {item.carrera || '—'}</Text>
            </View>
            <View style={s.acciones}>
              <TouchableOpacity style={s.chipAzul} onPress={() => abrirEditar(item)}>
                <Text style={s.chipTxt}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.chipRojo} onPress={() => eliminar(item)}>
                <Text style={s.chipTxt}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
 
      <TouchableOpacity style={s.boton} onPress={() => { limpiar(); setPantalla('registro'); }}>
        <Text style={s.botonTxt}>+ Nuevo estudiante</Text>
      </TouchableOpacity>
      {VentanaEliminar()}
    </SafeAreaView>
  );
}
 
const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#f4f6fb' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#1e3a8a' },
  contador: { textAlign: 'center', color: '#555', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  boton: { backgroundColor: '#1e3a8a', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  botonRojo: { backgroundColor: '#dc2626', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  botonTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonSec: { padding: 14, alignItems: 'center', marginTop: 6 },
  botonSecTxt: { color: '#1e3a8a', fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 2 },
  nombre: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  detalle: { color: '#444' },
  acciones: { gap: 6 },
  chipAzul: { backgroundColor: '#2563eb', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
  chipRojo: { backgroundColor: '#dc2626', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
  chipTxt: { color: '#fff', fontWeight: 'bold' },
  vacio: { textAlign: 'center', color: '#888', marginTop: 20 },
  chipGris: { backgroundColor: '#6b7280', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, alignItems: 'center' },
  mensaje: { textAlign: 'center', backgroundColor: '#dcfce7', color: '#166534', padding: 8, borderRadius: 6, marginBottom: 10 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 30 },
  cajaModal: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  tituloModal: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
});