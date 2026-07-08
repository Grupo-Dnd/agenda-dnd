import { useState, useEffect } from "react"
import { supabase } from './supabaseClient'
import capaBg from './capa.jpg'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid } from "recharts"
import { Truck, Clock, CheckCircle2, XCircle, AlertTriangle, Send, ChevronLeft, ChevronRight, Building2, Phone, FileText, RotateCcw, BarChart3, Beaker, Wheat, Boxes, Hash, ClipboardCheck, Lock, MapPin, LogIn, LogOut, Flag, Scale, Paperclip, Search, Activity, ShieldCheck, Weight, TrendingUp, Target, Package, Mail, Eye, EyeOff, Users, KeyRound, Plus, Power } from "lucide-react"

const C = { navy:"#11436F",navy2:"#1E73BE",orange:"#1E73BE",green:"#059669",cyan:"#2C7BE5",light:"#F1F5F9",gray:"#64748B",red:"#DC2626",purple:"#7E3FB5" }
const SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"]
const EXTRA_SLOTS = ["06:00","07:00","17:00","18:00","19:00"]
const DIAS = ["Seg","Ter","Qua","Qui","Sex"]
const TIPOS_DESCARGA = ["Empilhadeira","Paleteira","Manual","Bomba (granel)","Guindaste / Munck"]
const ENTIDADES = {
  dnd:{ label:"DND",icon:Beaker,color:"#15518A",cnpj:"",nota:"Química, Águas e Biotech" },
  dbl:{ label:"DBL",icon:Wheat,color:"#2E9B4E",cnpj:"",nota:"" },
}
const PERFIS = {
  fornecedor:{ label:"Fornecedor",desc:"Entrega CIF — o fornecedor traz a carga",op:"entrega",frete:"CIF",icon:Truck },
  logistica:{ label:"Analista de Transporte DND",desc:"Frete FOB contratado pela DND — agenda quem contratou",op:"entrega",frete:"FOB",icon:ClipboardCheck },
  transportadora:{ label:"Transportadora",desc:"Frete FOB — transportadora contratada pela DND",op:"entrega",frete:"FOB",icon:Truck },
  cliente:{ label:"Cliente",desc:"Retirada / expedição",op:"carregamento",frete:"—",icon:Building2 },
}
const EMPRESAS = {
  dnd:["Usina Santa Cruz","SAAE Municipal","BioCampo Ltda","Química Industrial SA","Águas do Vale"],
  dbl:["Fazenda São João","Cooperativa Central","AgroVale Insumos","Sítio Boa Vista","Usina Canavial"],
}
const ROLES = {
  cliente:{ label:"Cliente / Fornecedor",icon:Building2,color:C.cyan,tabs:["solicitar","acompanhar"],desc:"Agenda e acompanha apenas os próprios veículos" },
  recebimento:{ label:"Recebimento DND",icon:ClipboardCheck,color:C.green,tabs:["solicitar","acompanhar","portaria","clientes","painel"],desc:"Gestão completa da agenda e da operação" },
  portaria:{ label:"Portaria",icon:MapPin,color:C.navy2,tabs:["acompanhar","portaria"],desc:"Registra chegada, entrada, pesagem e saída" },
  sop:{ label:"Gerência S&OP",icon:ShieldCheck,color:C.purple,tabs:["solicitar","acompanhar","portaria","clientes","painel"],desc:"Acesso total + autoriza fora do expediente" },
}
const ATIVOS = ["pendente","confirmado","reagendado","na_portaria","em_patio","operando"]
const STAGES = [
  {k:"pendente",label:"Solicitado",icon:Send},{k:"confirmado",label:"Confirmado",icon:CheckCircle2},
  {k:"na_portaria",label:"Na portaria",icon:MapPin},{k:"em_patio",label:"Entrou / pátio",icon:LogIn},
  {k:"operando",label:"Operando",icon:Boxes},{k:"finalizado",label:"Finalizado",icon:Flag},
]
function stageIdx(s){ if(s==="reagendado")return 1; const i=STAGES.findIndex(x=>x.k===s); return i<0?0:i }
const STATUS_META = {
  pendente:{label:"Pendente",color:"#B45309",bg:"#FEF3C7"},confirmado:{label:"Confirmado",color:C.green,bg:"#E7F5EC"},
  reagendado:{label:"Reagendado",color:C.cyan,bg:"#E4F4FB"},na_portaria:{label:"Na portaria",color:"#2C7BE5",bg:"#E6F0FC"},
  em_patio:{label:"No pátio",color:C.navy2,bg:"#E5EAF1"},operando:{label:"Operando",color:C.orange,bg:"#E4EEF8"},
  finalizado:{label:"Finalizado",color:C.green,bg:"#E7F5EC"},cancelado:{label:"Cancelado",color:C.gray,bg:"#EDEFF1"},
  noshow:{label:"No-show",color:C.red,bg:"#FBEAE8"},
}
const initForm = { unidade:"",perfil:"fornecedor",empresa:"",cnpj:"",nfe:"",anexoNfe:"",pedidoCompra:"",pedidoVenda:"",transportadora:"",tipoVeiculo:"",placa:"",telefone:"",tipoDescarregamento:"",pesoKg:"",volumes:"",granel:false,data:"",hora:"",foraExpediente:false }

// ── Helpers ──────────────────────────────────────────────
function getWeekStart(o){ const d=new Date(); const day=d.getDay(); const diff=day===0?-6:1-day; d.setDate(d.getDate()+diff+o*7); d.setHours(0,0,0,0); return d }
function fmtISO(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
function parseISO(s){ const[y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d) }
function fmtBR(iso){ if(!iso)return"—"; const[,m,dd]=iso.split("-"); return`${dd}/${m}` }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x }
function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return fmtISO(d) }
function nowHM(){ const d=new Date(); return`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` }
function slotMin(hm){ const[h,m]=hm.split(":").map(Number); return h*60+m }
function minTo(min){ min=Math.max(0,min); const h=Math.floor(min/60)%24,m=Math.round(min%60); return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}` }

// DB → app field mapping
function fromDB(b){
  if(!b)return null
  return{
    ...b,
    unidade:b.entidade||b.unidade||"dnd",
    perfil:b.perfil_solicitante||b.perfil||"fornecedor",
    operacao:b.operacao||PERFIS[b.perfil_solicitante]?.op||"entrega",
    foraExpediente:b.fora_expediente||false,
    tipoVeiculo:b.tipo_veiculo||"",
    tipoDescarregamento:b.tipo_descarregamento||"",
    pesoKg:b.peso_kg||"",
    pesoTara:b.peso_tara||null,
    pesoBruto:b.peso_bruto||null,
    chegadaReal:b.chegada_real||null,
    pedidoCompra:b.operacao==="entrega"?(b.pedido||""):"",
    pedidoVenda:b.operacao==="carregamento"?(b.pedido||""):"",
    autorizada:b.autorizada||false,
    granel:b.granel||false,
    frete:b.frete||"—",
    volumes:b.volumes||"",
    empresa:b.empresa||"",
    cnpj:b.cnpj||"",
    protocolo:b.protocolo||("AG-"+b.id?.slice(0,6).toUpperCase()),
  }
}

const KF=`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes pulseSoft{0%,100%{opacity:1}50%{opacity:.55}}.dnd-primary{transition:filter .15s}.dnd-primary:hover{filter:brightness(1.1)}`

// ── App ───────────────────────────────────────────────────
export default function App(){
  const[session,setSession]=useState(null)
  const[tab,setTab]=useState("painel")
  const[bookings,setBookings]=useState([])
  const[cap,setCap]=useState(1)
  const[loaded,setLoaded]=useState(false)
  const[weekOffset,setWeekOffset]=useState(0)
  const[recovery,setRecovery]=useState(false)

  useEffect(()=>{
    let mounted=true
    const ehDefinirSenha=new URLSearchParams(window.location.search).has("definir-senha")
    if(ehDefinirSenha){setRecovery(true);setLoaded(true)}
    supabase.auth.getSession().then(({data:{session:s}})=>{
      if(!mounted)return
      if(ehDefinirSenha)return            // mostra a tela de senha, não entra no app
      if(s)loadUserData(s.user.id)
      else setLoaded(true)
    })
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,s)=>{
      if(!mounted)return
      if(event==="PASSWORD_RECOVERY"){setRecovery(true);setLoaded(true);return}
      if(event==="SIGNED_IN"&&s){if(ehDefinirSenha)return;setLoaded(false);await loadUserData(s.user.id)}
      else if(event==="SIGNED_OUT"){setSession(null);setBookings([]);setLoaded(true)}
    })
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])

  async function loadUserData(userId){
    const{data:perfil}=await supabase.from("perfis").select("papel,empresa_id").eq("id",userId).single()
    if(!perfil){await supabase.auth.signOut();setLoaded(true);return}
    let empresaNome=null
    if(perfil.empresa_id){
      const{data:emp}=await supabase.from("empresas").select("razao_social").eq("id",perfil.empresa_id).single()
      empresaNome=emp?.razao_social
    }
    const[bkRes,capRes]=await Promise.all([
      supabase.from("agendamentos").select("*").order("data",{ascending:false}),
      supabase.from("capacidade").select("docas_por_horario").single()
    ])
    setSession({role:perfil.papel,empresa:empresaNome,empresa_id:perfil.empresa_id})
    setBookings((bkRes.data||[]).map(fromDB))
    setCap(capRes.data?.docas_por_horario||1)
    const t=ROLES[perfil.papel]?.tabs||["solicitar"]
    setTab(t.includes("painel")?"painel":t[0])
    setLoaded(true)
  }

  async function addBooking(formData){
    const{data,error}=await supabase.from("agendamentos").insert({
      entidade:formData.unidade, empresa_id:session.empresa_id||null,
      cnpj:formData.cnpj,
      perfil_solicitante:formData.perfil, operacao:PERFIS[formData.perfil].op,
      frete:PERFIS[formData.perfil].frete, data:formData.data, hora:formData.hora,
      fora_expediente:formData.foraExpediente, status:"pendente",
      nfe:formData.nfe, pedido:formData.operacao==="entrega"?formData.pedidoCompra:formData.pedidoVenda,
      transportadora:formData.transportadora, tipo_veiculo:formData.tipoVeiculo,
      placa:formData.placa, telefone:formData.telefone,
      tipo_descarregamento:formData.tipoDescarregamento,
      peso_kg:formData.pesoKg?Number(formData.pesoKg):null,
      volumes:(!formData.granel&&formData.volumes)?Number(formData.volumes):null,
      granel:formData.granel,
    }).select().single()
    if(!error&&data){setBookings(prev=>[fromDB(data),...prev]);return data.protocolo}
    console.error(error);return null
  }

  async function updB(id,patch){
    const dbPatch={}
    if(patch.status!==undefined)dbPatch.status=patch.status
    if(patch.autorizada!==undefined)dbPatch.autorizada=patch.autorizada
    if(patch.chegadaReal!==undefined)dbPatch.chegada_real=patch.chegadaReal
    if(patch.entrada!==undefined)dbPatch.entrada=patch.entrada
    if(patch.saida!==undefined)dbPatch.saida=patch.saida
    if(patch.pesoTara!==undefined)dbPatch.peso_tara=patch.pesoTara
    if(patch.pesoBruto!==undefined)dbPatch.peso_bruto=patch.pesoBruto
    if(patch.data!==undefined)dbPatch.data=patch.data
    if(patch.hora!==undefined)dbPatch.hora=patch.hora
    await supabase.from("agendamentos").update(dbPatch).eq("id",id)
    setBookings(prev=>prev.map(b=>b.id===id?{...b,...patch}:b))
  }

  async function updateCap(newCap){
    setCap(newCap)
    await supabase.from("capacidade").update({docas_por_horario:newCap}).eq("id",1)
  }

  function logout(){ supabase.auth.signOut() }

  const remaining=(data,hora)=>Math.max(0,cap-bookings.filter(b=>b.data===data&&b.hora===hora&&ATIVOS.includes(b.status)).length)
  const ws=getWeekStart(weekOffset)
  const weekDates=DIAS.map((_,i)=>fmtISO(addDays(ws,i)))

  if(!loaded)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:C.gray}}>Carregando...</div>

  if(recovery)return<div className="w-full" style={{fontFamily:"system-ui,sans-serif",color:C.navy}}><style>{KF}</style><DefinirSenha /></div>

  if(!session)return<div className="w-full" style={{fontFamily:"system-ui,sans-serif",color:C.navy}}><style>{KF}</style><Login /></div>

  const allowed=ROLES[session.role].tabs
  const activeTab=allowed.includes(tab)?tab:allowed[0]
  const TABS=[["solicitar","Solicitar",Send],["acompanhar","Acompanhar",Activity],["portaria","Portaria",MapPin],["clientes","Clientes",Users],["painel","Painel DND",BarChart3]].filter(([k])=>allowed.includes(k))
  const role=ROLES[session.role]

  return(
    <div style={{fontFamily:"system-ui,sans-serif",color:C.navy,width:"90%",maxWidth:1800,margin:"12px auto 24px"}}>
      <style>{KF}</style>
      <BrandHeader/>
      <div className="flex items-center justify-between px-5 py-2 text-xs flex-wrap gap-2" style={{background:"#fff",borderBottom:"1px solid #E3E7EB"}}>
        <span style={{color:C.gray}}>Conectado como <b style={{color:role.color}}>{role.label}</b>{session.empresa?` · ${session.empresa}`:""}</span>
        <button onClick={logout} className="px-3 py-1 rounded-md font-semibold flex items-center gap-1" style={{background:"#EDEFF1",color:C.navy}}><LogOut size={12}/> Sair</button>
      </div>
      <div className="flex overflow-x-auto border-b" style={{background:"#fff",borderColor:"#E3E7EB"}}>
        {TABS.map(([k,l,I])=><button key={k} onClick={()=>setTab(k)} className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold whitespace-nowrap flex-1" style={{color:activeTab===k?C.navy:C.gray,borderBottom:activeTab===k?`3px solid ${C.orange}`:"3px solid transparent"}}><I size={16}/> {l}</button>)}
      </div>
      <div className="p-5" style={{background:C.light}}>
        {activeTab==="solicitar"&&<Solicitar {...{weekDates,weekOffset,setWeekOffset,remaining,cap,bookings,addBooking,fixedEmpresa:session.role==="cliente"?session.empresa:""}}/>}
        {activeTab==="acompanhar"&&<Acompanhar bookings={bookings} filterEmpresa={session.role==="cliente"?session.empresa:null}/>}
        {activeTab==="portaria"&&<Portaria {...{bookings,updB}}/>}
        {activeTab==="clientes"&&<Clientes/>}
        {activeTab==="painel"&&<Painel {...{bookings,cap,updateCap,updB,weekDates,weekOffset,setWeekOffset,canAuthorize:session.role==="sop"}}/>}
      </div>
      <div className="rounded-b-xl px-5 py-3 text-center text-xs font-semibold" style={{background:C.navy,color:"#fff"}}>Agendar é cuidar do seu tempo e do nosso pátio — vamos juntos.</div>
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────
function Login(){
  const[id,setId]=useState("")
  const[pw,setPw]=useState("")
  const[showPw,setShowPw]=useState(false)
  const[err,setErr]=useState("")
  const[loading,setLoading]=useState(false)
  const[forgotSent,setForgotSent]=useState(false)

  async function handleLogin(e){
    e.preventDefault(); setLoading(true); setErr("")
    try{
      let email=id.trim()
      if(!email.includes("@")){
        const{data:emailEnc}=await supabase.rpc("email_por_cnpj",{p_cnpj:email})
        if(!emailEnc){setErr("CNPJ não encontrado. Entre em contato com a DND.");setLoading(false);return}
        email=emailEnc
      }
      const{error:authErr}=await supabase.auth.signInWithPassword({email,password:pw})
      if(authErr)setErr("Senha incorreta. Verifique ou clique em 'Esqueci a senha'.")
    }catch{setErr("Erro inesperado. Tente novamente.")}
    setLoading(false)
  }

  async function handleForgot(){
    let email=id.trim()
    if(!email){setErr("Informe o CNPJ ou e-mail primeiro.");return}
    if(!email.includes("@")){
      const{data:emailEnc}=await supabase.rpc("email_por_cnpj",{p_cnpj:email})
      if(!emailEnc){setErr("CNPJ não encontrado.");return}
      email=emailEnc
    }
    await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/?definir-senha=1`})
    setForgotSent(true); setErr("")
  }

  return(
    <div style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:28,overflow:"hidden",fontFamily:"system-ui,sans-serif"}}>
      <div style={{position:"absolute",inset:0,background:`url(${capaBg}) center/cover no-repeat`,transform:"scale(1.02)"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(120deg,rgba(13,58,102,.86) 0%,rgba(17,67,111,.62) 45%,rgba(21,81,138,.42) 100%)"}}/>
      <div className="hidden md:block" style={{position:"absolute",left:32,bottom:28,color:"#fff",maxWidth:"52%",zIndex:1,textShadow:"0 2px 8px rgba(0,0,0,.4)"}}>
        <div style={{fontSize:13,opacity:.9}}>Portal de Agendamento · Grupo DND / DBL Agro</div>
        <div style={{fontSize:30,fontWeight:800,lineHeight:1.1,marginTop:4}}>Carregamentos &amp; Descarregamentos</div>
      </div>
      <div style={{position:"relative",width:"100%",maxWidth:410,background:"rgba(255,255,255,.97)",borderRadius:18,overflow:"hidden",boxShadow:"0 30px 70px rgba(0,0,0,.45)",animation:"fadeUp .4s ease both"}}>
        <div style={{height:6,background:"linear-gradient(90deg,#1E73BE,#15518A 50%,#0D3A66)"}}/>
        <div style={{padding:"30px 30px 22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="https://ohpmbslsnxzepcasmdte.supabase.co/storage/v1/object/public/marca/logogrupodnd.png" alt="DND" style={{height:44}}/>
            <div><div style={{fontWeight:800,color:"#11436F",fontSize:19,lineHeight:1.1}}>Agendamento</div><div style={{fontSize:12,color:"#64748B"}}>Grupo DND / DBL Agro</div></div>
          </div>
          <div style={{marginTop:16,fontSize:12,fontWeight:700,letterSpacing:".4px",color:"#1E73BE",textTransform:"uppercase"}}>Entrar no portal</div>
          <p style={{color:"#64748B",fontSize:13,margin:"4px 0 16px"}}>Acesse com seu <b>CNPJ</b> e senha. Acesso interno: use seu e-mail.</p>
          {forgotSent?(
            <div style={{textAlign:"center",padding:16,borderRadius:10,background:"#E7F5EC",color:C.green}}>
              <CheckCircle2 size={32} style={{margin:"0 auto 8px"}}/>
              <p style={{fontWeight:600}}>E-mail de redefinição enviado!</p>
              <p style={{fontSize:12,marginTop:4}}>Verifique sua caixa de entrada.</p>
              <button style={{marginTop:12,fontSize:12,textDecoration:"underline",color:C.navy,background:"none",border:0,cursor:"pointer"}} onClick={()=>setForgotSent(false)}>Voltar ao login</button>
            </div>
          ):(
            <form onSubmit={handleLogin}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#334155",marginBottom:5}}>CNPJ (ou e-mail para acesso interno)</label>
              <input value={id} onChange={e=>setId(e.target.value)} placeholder="00.000.000/0001-00" required style={{width:"100%",border:"1px solid #E3E7EB",borderRadius:10,padding:"11px 12px",fontSize:14,marginBottom:13,outline:"none"}}/>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#334155",marginBottom:5}}>Senha</label>
              <div style={{position:"relative",marginBottom:13}}>
                <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Digite sua senha" required style={{width:"100%",border:"1px solid #E3E7EB",borderRadius:10,padding:"11px 40px 11px 12px",fontSize:14,outline:"none"}}/>
                <button type="button" onClick={()=>setShowPw(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#64748B",background:"none",border:0,cursor:"pointer"}}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
              </div>
              {err&&<p style={{fontSize:12,padding:"8px 12px",borderRadius:10,background:"#FBEAE8",color:C.red,marginBottom:10}}>{err}</p>}
              <button type="submit" disabled={loading} className="dnd-primary" style={{width:"100%",background:"#1E73BE",color:"#fff",border:0,borderRadius:10,padding:12,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?.6:1}}>
                {loading?<><RotateCcw size={15} className="animate-spin"/> Entrando...</>:<><LogIn size={15}/> Entrar</>}
              </button>
              <button type="button" onClick={handleForgot} style={{display:"block",width:"100%",textAlign:"center",color:"#1E73BE",fontSize:12,marginTop:11,background:"none",border:0,cursor:"pointer"}}>Esqueci a senha</button>
            </form>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:20,paddingTop:15,borderTop:"1px solid #eef1f4"}}>
            {["dndquimica","dndagrociencia","dndaguas"].map(n=>(
              <span key={n} style={{width:38,height:38,borderRadius:"50%",background:"#fff",border:"1px solid #e8edf2",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 2px rgba(0,0,0,.06)"}}>
                <img src={`https://ohpmbslsnxzepcasmdte.supabase.co/storage/v1/object/public/marca/${n}.png`} alt={n} style={{width:26,height:26,objectFit:"contain",display:"block"}}/>
              </span>
            ))}
            <span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8"}}>grupodnd.com.br</span>
          </div>
        </div>
        <div style={{background:"#0D3A66",color:"#fff",textAlign:"center",fontSize:12,fontWeight:700,padding:10}}>Agendar é cuidar do seu tempo e do nosso pátio — vamos juntos.</div>
      </div>
    </div>
  )
}

// ── DefinirSenha (convite + reset) ────────────────────────
function DefinirSenha(){
  const[pw,setPw]=useState("");const[pw2,setPw2]=useState("")
  const[show,setShow]=useState(false);const[err,setErr]=useState("");const[ok,setOk]=useState(false);const[loading,setLoading]=useState(false)
  async function salvar(e){
    e.preventDefault();setErr("")
    if(pw.length<6){setErr("A senha precisa ter ao menos 6 caracteres.");return}
    if(pw!==pw2){setErr("As senhas não conferem.");return}
    setLoading(true)
    const{error}=await supabase.auth.updateUser({password:pw})
    setLoading(false)
    if(error){setErr("Não foi possível salvar. O link pode ter expirado — peça um novo à DND.");return}
    setOk(true)
  }
  return(
    <div>
      <BrandHeader/>
      <div className="p-6" style={{background:C.light}}>
        <div className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-6" style={{animation:"fadeUp .4s ease both"}}>
          {ok?(
            <div className="text-center p-2">
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{background:"#E7F5EC"}}><CheckCircle2 size={30} color={C.green}/></div>
              <h3 className="font-bold text-lg">Senha definida!</h3>
              <p className="text-xs mt-1" style={{color:C.gray}}>Já pode acessar o portal.</p>
              <button onClick={()=>window.location.replace(window.location.origin)} className="mt-4 w-full py-2.5 rounded-lg text-white text-sm font-semibold" style={{background:C.navy}}>Entrar no portal</button>
            </div>
          ):(
            <form onSubmit={salvar} className="space-y-3">
              <div className="flex items-center gap-2 mb-1"><KeyRound size={18} color={C.orange}/><h3 className="font-bold text-lg">Defina sua senha</h3></div>
              <p className="text-xs" style={{color:C.gray}}>Crie uma senha para acessar o Portal Agenda DND/DBL.</p>
              <label className="block"><span className="text-xs font-medium mb-1 block">Nova senha</span>
                <div className="relative">
                  <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none pr-10" style={{borderColor:"#E3E7EB"}} required/>
                  <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:C.gray}}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                </div>
              </label>
              <label className="block"><span className="text-xs font-medium mb-1 block">Confirme a senha</span>
                <input type={show?"text":"password"} value={pw2} onChange={e=>setPw2(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{borderColor:"#E3E7EB"}} required/>
              </label>
              {err&&<p className="text-xs px-3 py-2 rounded-lg" style={{background:"#FBEAE8",color:C.red}}>{err}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60" style={{background:C.navy}}>{loading?<><RotateCcw size={15} className="animate-spin"/> Salvando...</>:<><KeyRound size={15}/> Salvar senha</>}</button>
            </form>
          )}
        </div>
      </div>
      <div className="rounded-b-xl px-5 py-3 text-center text-xs font-semibold" style={{background:C.navy,color:"#fff"}}>Agendar é cuidar do seu tempo e do nosso pátio — vamos juntos.</div>
    </div>
  )
}

// ── Clientes (admin) ──────────────────────────────────────
function Clientes(){
  const[lista,setLista]=useState([])
  const[loading,setLoading]=useState(true)
  const[form,setForm]=useState({razao_social:"",cnpj:"",email:""})
  const[saving,setSaving]=useState(false)
  const[msg,setMsg]=useState(null)
  const[busca,setBusca]=useState("")
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}))

  async function carregar(){
    setLoading(true)
    const{data}=await supabase.from("empresas").select("*").eq("tipo","cliente").order("razao_social")
    setLista(data||[]);setLoading(false)
  }
  useEffect(()=>{carregar()},[])

  async function cadastrar(){
    if(!form.razao_social.trim()||!form.cnpj.trim()||!form.email.trim()){setMsg({t:"erro",x:"Preencha razão social, CNPJ e e-mail."});return}
    setSaving(true);setMsg(null)
    const{data,error}=await supabase.functions.invoke("criar-cliente",{body:form})
    if(error){
      let x="Erro ao cadastrar o cliente."
      try{const j=await error.context.json();if(j?.error)x=j.error}catch{}
      setMsg({t:"erro",x})
    }else if(data?.error){setMsg({t:"erro",x:data.error})}
    else{setMsg({t:"ok",x:`Cliente cadastrado. E-mail de definição de senha enviado para ${form.email}.`});setForm({razao_social:"",cnpj:"",email:""});carregar()}
    setSaving(false)
  }

  async function toggleAtivo(emp){
    const novo=!emp.ativo
    setLista(prev=>prev.map(e=>e.id===emp.id?{...e,ativo:novo}:e))
    const{error}=await supabase.from("empresas").update({ativo:novo}).eq("id",emp.id)
    if(error){setLista(prev=>prev.map(e=>e.id===emp.id?{...e,ativo:!novo}:e));setMsg({t:"erro",x:"Não foi possível alterar o status — falta a policy de UPDATE em empresas."})}
  }

  const fmtCNPJ=c=>{const d=String(c||"").replace(/\D/g,"");return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"):c}
  const filtrada=busca?lista.filter(e=>(e.razao_social||"").toLowerCase().includes(busca.toLowerCase())||(e.cnpj||"").includes(busca.replace(/\D/g,""))):lista

  return(
    <div>
      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1"><Building2 size={18} color={C.cyan}/><h3 className="font-bold">Cadastrar novo cliente</h3></div>
        <p className="text-xs mb-4" style={{color:C.gray}}>Cria o acesso e envia um e-mail para o cliente <b>definir a própria senha</b>. Login dele: CNPJ ou e-mail.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block"><span className="text-xs font-medium mb-1 block">Razão social</span><input value={form.razao_social} onChange={e=>upd("razao_social",e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{borderColor:"#E3E7EB"}}/></label>
          <label className="block"><span className="text-xs font-medium mb-1 block">CNPJ</span><input value={form.cnpj} onChange={e=>upd("cnpj",e.target.value)} placeholder="00.000.000/0001-00" className="w-full px-3 py-2 rounded-lg border text-sm" style={{borderColor:"#E3E7EB"}}/></label>
          <label className="block"><span className="text-xs font-medium mb-1 block">E-mail do cliente</span><input type="email" value={form.email} onChange={e=>upd("email",e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{borderColor:"#E3E7EB"}}/></label>
        </div>
        {msg&&<p className="text-xs px-3 py-2 rounded-lg mt-3" style={{background:msg.t==="ok"?"#E7F5EC":"#FBEAE8",color:msg.t==="ok"?C.green:C.red}}>{msg.x}</p>}
        <div className="flex justify-end mt-4"><button onClick={cadastrar} disabled={saving} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60" style={{background:C.navy}}>{saving?<><RotateCcw size={15} className="animate-spin"/> Cadastrando...</>:<><Plus size={15}/> Cadastrar e enviar convite</>}</button></div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm mb-3"><div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{borderColor:"#E3E7EB"}}><Search size={15} color={C.gray}/><input placeholder="Buscar por razão social ou CNPJ" value={busca} onChange={e=>setBusca(e.target.value)} className="flex-1 text-sm outline-none"/></div></div>

      <div className="text-xs font-semibold mb-2" style={{color:C.gray}}>CLIENTES CADASTRADOS · {filtrada.length}</div>
      <div className="space-y-2">
        {loading&&<div className="bg-white rounded-xl p-6 text-center text-sm shadow-sm" style={{color:C.gray}}>Carregando...</div>}
        {!loading&&filtrada.length===0&&<div className="bg-white rounded-xl p-6 text-center text-sm shadow-sm" style={{color:C.gray}}>Nenhum cliente cadastrado ainda.</div>}
        {filtrada.map(e=>(
          <div key={e.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between gap-3 flex-wrap transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{background:(e.ativo?C.green:C.gray)+"15"}}><Building2 size={18} color={e.ativo?C.green:C.gray}/></div>
              <div><div className="font-semibold text-sm flex items-center gap-2 flex-wrap">{e.razao_social}<span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:e.ativo?"#E7F5EC":"#EDEFF1",color:e.ativo?C.green:C.gray}}>{e.ativo?"Ativo":"Inativo"}</span></div>
                <div className="text-[11px] mt-0.5" style={{color:C.gray}}>{fmtCNPJ(e.cnpj)} · {e.email}</div></div>
            </div>
            <button onClick={()=>toggleAtivo(e)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:brightness-95" style={{background:(e.ativo?C.red:C.green)+"15",color:e.ativo?C.red:C.green}}><Power size={13}/> {e.ativo?"Desativar":"Reativar"}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── BrandHeader ───────────────────────────────────────────
function BrandHeader(){
  return(
    <div className="rounded-t-xl overflow-hidden" style={{position:"relative"}}>
      <div className="h-1.5 w-full" style={{background:"linear-gradient(90deg,#1E73BE 0%,#15518A 50%,#0D3A66 100%)"}}/>
      <div className="px-5 pt-4 pb-5" style={{position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:`url(${capaBg}) center/cover no-repeat`}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(120deg,rgba(13,58,102,.93) 0%,rgba(17,67,111,.82) 55%,rgba(21,81,138,.72) 100%)"}}/>
        <div style={{position:"relative"}}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{background:"rgba(255,255,255,0.14)"}}><Truck size={22} color="#fff"/></div>
              <div><div className="text-white font-bold text-lg leading-tight">Agenda DND/DBL</div><div className="text-xs" style={{color:"#AFC6DC"}}>Portal de Agendamento de Carga e Descarga</div></div>
            </div>
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full" style={{background:"rgba(255,255,255,0.12)",color:"#DCE8F2"}}><Clock size={13}/> Seg–Sex · 08:00–17:00</div>
          </div>
          <p className="text-white font-semibold text-sm mb-3 max-w-2xl">Empresa referência nos setores sucroenergético, industrial, tratamento de água e agrícola.</p>
          <div className="inline-flex flex-wrap gap-x-4 gap-y-1.5 bg-white rounded-full px-4 py-2 shadow-md">
            {Object.values(ENTIDADES).map(u=><span key={u.label} className="flex items-center gap-1.5 text-xs font-bold" style={{color:u.color}}><span className="w-2 h-2 rounded-full" style={{background:u.color}}/>{u.label}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── useCountUp ────────────────────────────────────────────
function useCountUp(target,dur=900){
  const[v,setV]=useState(0)
  useEffect(()=>{let raf,start;const ease=p=>1-Math.pow(1-p,3);const step=t=>{if(!start)start=t;const p=Math.min(1,(t-start)/dur);setV(target*ease(p));if(p<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[target])
  return v
}
function KpiCard({label,value,suffix="",decimals=0,color,icon:I,i}){
  const v=useCountUp(value)
  return(
    <div className="bg-white rounded-xl p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{animation:"fadeUp .5s ease both",animationDelay:`${i*55}ms`}}>
      <div className="flex items-center justify-between"><span className="text-xs font-medium" style={{color:C.gray}}>{label}</span><I size={15} color={color}/></div>
      <div className="text-2xl font-bold mt-1" style={{color}}>{v.toFixed(decimals)}{suffix}</div>
    </div>
  )
}

// ── Solicitar ─────────────────────────────────────────────
function Solicitar({weekDates,weekOffset,setWeekOffset,remaining,cap,bookings,addBooking,fixedEmpresa}){
  const[step,setStep]=useState(1)
  const[form,setForm]=useState({...initForm,empresa:fixedEmpresa||"",perfil:fixedEmpresa?"cliente":"fornecedor"})
  const[prot,setProt]=useState(null)
  const[showExtra,setShowExtra]=useState(false)
  const[saving,setSaving]=useState(false)
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}))
  const op=PERFIS[form.perfil].op
  const tISO=todayISO()
  function pickEnt(k){setForm(f=>({...f,unidade:k,cnpj:ENTIDADES[k].cnpj}))}
  let obrig=op==="entrega"?["empresa","cnpj","nfe","anexoNfe","pedidoCompra","tipoVeiculo","placa","telefone","tipoDescarregamento","pesoKg"]:["empresa","cnpj","pedidoVenda","transportadora","tipoVeiculo","placa","telefone","tipoDescarregamento","pesoKg"]
  if(!form.granel)obrig=[...obrig,"volumes"]
  const faltando=obrig.filter(k=>!String(form[k]??"").trim())
  async function enviar(){
    setSaving(true)
    const p=await addBooking(form)
    if(p){setProt(p);setStep(6)}
    else alert("Erro ao salvar. Tente novamente.")
    setSaving(false)
  }
  if(step===6)return(
    <div className="bg-white rounded-xl p-8 text-center shadow-sm" style={{animation:"fadeUp .4s ease both"}}>
      <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{background:"#E7F5EC"}}><CheckCircle2 size={36} color={C.green}/></div>
      <h3 className="text-xl font-bold">Solicitação enviada!</h3>
      <p className="text-sm mt-1" style={{color:C.gray}}>Protocolo <b style={{color:C.navy}}>{prot}</b> · status <b style={{color:C.orange}}>Pendente</b></p>
      {form.foraExpediente&&<p className="text-xs mt-2 inline-block px-3 py-1 rounded-full font-semibold" style={{background:"#F0E6FA",color:C.purple}}>🛡️ Aguardando autorização da Gerência S&OP</p>}
      <p className="text-sm mt-3 max-w-md mx-auto" style={{color:C.gray}}>Acompanhe na aba <b>Acompanhar</b>.</p>
      <button onClick={()=>{setForm({...initForm,empresa:fixedEmpresa||"",perfil:fixedEmpresa?"cliente":"fornecedor"});setStep(1);setProt(null)}} className="mt-5 px-5 py-2.5 rounded-lg text-white text-sm font-semibold" style={{background:C.navy}}>Novo agendamento</button>
    </div>
  )
  return(
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <StepDots step={step}/>
      {step===1&&(
        <div>
          <h3 className="font-bold mb-1">Qual empresa?</h3>
          <p className="text-xs mb-3" style={{color:C.gray}}>DND (Química, Águas e Biotech). DBL tem CNPJ próprio.</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ENTIDADES).map(([k,u])=>{const I=u.icon;const a=form.unidade===k;return(
              <button key={k} onClick={()=>pickEnt(k)} className="rounded-lg p-4 border-2 flex flex-col items-center gap-1.5 transition-all hover:-translate-y-0.5" style={{borderColor:a?u.color:"#E3E7EB",background:a?u.color+"12":"#fff"}}>
                <I size={26} color={u.color}/><span className="text-base font-bold">{u.label}</span><span className="text-[10px] text-center" style={{color:C.gray}}>{u.nota}</span></button>)})}
          </div>
          <div className="flex justify-end mt-5"><button disabled={!form.unidade} onClick={()=>setStep(2)} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{background:C.navy}}>Continuar</button></div>
        </div>
      )}
      {step===2&&(
        <div>
          <h3 className="font-bold mb-1">Quem está solicitando?</h3>
          <p className="text-xs mb-3" style={{color:C.gray}}>Frete <b>FOB</b> contratado pela DND: agenda o <b>analista de transporte</b> ou a <b>transportadora</b>.</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PERFIS).map(([k,p])=>{const I=p.icon;const a=form.perfil===k;return(
              <button key={k} onClick={()=>upd("perfil",k)} className="rounded-lg p-3 text-left border-2 transition-all hover:-translate-y-0.5" style={{borderColor:a?C.orange:"#E3E7EB",background:a?"#FDF7F2":"#fff"}}>
                <div className="flex items-center gap-2"><I size={18} color={a?C.orange:C.gray}/><span className="text-sm font-semibold">{p.label}</span>{p.frete!=="—"&&<span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{background:p.frete==="FOB"?"#FDE9D6":"#DDEBF7",color:p.frete==="FOB"?C.orange:"#2C7BE5"}}>{p.frete}</span>}</div>
                <div className="text-[11px] mt-1" style={{color:C.gray}}>{p.desc}</div></button>)})}
          </div>
          <div className="flex justify-between mt-5">
            <button onClick={()=>setStep(1)} className="px-4 py-2.5 rounded-lg text-sm font-semibold border" style={{borderColor:"#E3E7EB",color:C.navy}}>Voltar</button>
            <button onClick={()=>{setForm(f=>({...f,data:"",hora:"",foraExpediente:false}));setShowExtra(false);setStep(3)}} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold" style={{background:C.navy}}>Continuar</button>
          </div>
        </div>
      )}
      {step===3&&(
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">Escolha a janela</h3>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={()=>setWeekOffset(w=>w-1)} className="p-1.5 rounded-md border" style={{borderColor:"#E3E7EB"}}><ChevronLeft size={15}/></button>
              <span style={{color:C.gray}}>{fmtBR(weekDates[0])}–{fmtBR(weekDates[4])}</span>
              <button onClick={()=>setWeekOffset(w=>w+1)} className="p-1.5 rounded-md border" style={{borderColor:"#E3E7EB"}}><ChevronRight size={15}/></button>
            </div>
          </div>
          <div className="mb-3 text-xs px-3 py-2 rounded-lg flex items-center gap-2" style={{background:"#E5EAF1",color:C.navy2}}><Lock size={13}/> Agenda compartilhada: <b>{cap} veículo(s) por horário</b> — vale para DND e DBL juntas.</div>
          <div className="overflow-x-auto"><div className="min-w-[480px]">
            <div className="grid grid-cols-6 gap-1 mb-1"><div/>{DIAS.map((d,i)=><div key={d} className="text-center text-xs font-semibold">{d}<div className="text-[10px] font-normal" style={{color:C.gray}}>{fmtBR(weekDates[i])}</div></div>)}</div>
            {SLOTS.map(hora=><SlotRow key={hora} {...{hora,weekDates,tISO,remaining,form,setForm,fora:false}}/>)}
            <div className="mt-2 pt-2 border-t" style={{borderColor:"#E3E7EB"}}>
              <button onClick={()=>setShowExtra(s=>!s)} className="text-xs font-semibold flex items-center gap-1.5 px-2 py-1.5 rounded-md" style={{color:C.purple,background:"#F4ECFB"}}><ShieldCheck size={13}/> {showExtra?"Ocultar":"Solicitar"} horário fora do expediente (autorização S&OP)</button>
              <div className="text-[11px] mt-2 px-2 py-1.5 rounded flex items-center gap-1.5" style={{background:"#E6F0FC",color:"#2C7BE5"}}><Mail size={13}/> Precisa de um horário diferente? Envie e-mail para <b>agendamento@grupodnd.com.br</b></div>
              {showExtra&&(<div className="mt-2">
                <div className="text-[11px] mb-1 px-2 py-1.5 rounded" style={{background:"#F4ECFB",color:C.purple}}>⚠️ Antes das 08:00 ou após 17:00 — autorização exclusiva da Gerência S&OP.</div>
                {EXTRA_SLOTS.map(hora=><SlotRow key={hora} {...{hora,weekDates,tISO,remaining,form,setForm,fora:true}}/>)}
              </div>)}
            </div>
          </div></div>
          <div className="flex items-center gap-3 mt-2 text-[11px]" style={{color:C.gray}}>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{background:"#E7F5EC"}}/> livre</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{background:"#EDEFF1"}}/> ocupado (travado p/ todos)</span>
          </div>
          <div className="flex justify-between mt-5">
            <button onClick={()=>setStep(2)} className="px-4 py-2.5 rounded-lg text-sm font-semibold border" style={{borderColor:"#E3E7EB",color:C.navy}}>Voltar</button>
            <button disabled={!form.data} onClick={()=>setStep(4)} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{background:C.navy}}>Continuar</button>
          </div>
        </div>
      )}
      {step===4&&(
        <div>
          <h3 className="font-bold mb-1">Dados do agendamento</h3>
          <p className="text-xs mb-4" style={{color:C.gray}}>⚠️ Solicitações incompletas não serão processadas.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Empresa" icon={Building2} v={form.empresa} on={v=>upd("empresa",v)} disabled={!!fixedEmpresa}/>
            <Field label="CNPJ" icon={Hash} v={form.cnpj} on={v=>upd("cnpj",v)}/>
            {op==="entrega"?(<><Field label="Nº NF-e" icon={FileText} v={form.nfe} on={v=>upd("nfe",v)}/><FileField label="Anexar NF-e (PDF/XML)" v={form.anexoNfe} on={v=>upd("anexoNfe",v)}/><Field label="Pedido de Compra" icon={FileText} v={form.pedidoCompra} on={v=>upd("pedidoCompra",v)}/></>)
            :(<><Field label="Nº do Pedido (venda)" icon={FileText} v={form.pedidoVenda} on={v=>upd("pedidoVenda",v)}/><Field label="Transportadora" icon={Truck} v={form.transportadora} on={v=>upd("transportadora",v)}/></>)}
            <Field label="Tipo de veículo" icon={Truck} v={form.tipoVeiculo} on={v=>upd("tipoVeiculo",v)}/>
            <Field label="Placa" icon={Hash} v={form.placa} on={v=>upd("placa",v)}/>
            <Field label="Telefone do motorista" icon={Phone} v={form.telefone} on={v=>upd("telefone",v)}/>
          </div>
          <div className="mt-3 rounded-lg p-3" style={{background:C.light}}>
            <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Boxes size={13} color={C.gray}/> Dados da carga</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-medium mb-1 block">Tipo de descarregamento</span>
                <select value={form.tipoDescarregamento} onChange={e=>upd("tipoDescarregamento",e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{borderColor:form.tipoDescarregamento?"#E3E7EB":"#BFD3E6"}}><option value="">Selecione...</option>{TIPOS_DESCARGA.map(t=><option key={t}>{t}</option>)}</select></label>
              <label className="block"><span className="text-xs font-medium mb-1 flex items-center gap-1"><Weight size={12} color={C.gray}/> Peso total (kg)</span>
                <input type="number" value={form.pesoKg} onChange={e=>upd("pesoKg",e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{borderColor:form.pesoKg?"#E3E7EB":"#BFD3E6"}}/></label>
              <label className="flex items-center gap-2 text-sm font-medium pt-1"><input type="checkbox" checked={form.granel} onChange={e=>setForm(f=>({...f,granel:e.target.checked,volumes:e.target.checked?"":f.volumes}))}/> Produto a granel</label>
              <label className="block"><span className="text-xs font-medium mb-1 block">Qtd de volumes</span>
                <input type="number" disabled={form.granel} value={form.granel?"":form.volumes} placeholder={form.granel?"N/A (granel)":""} onChange={e=>upd("volumes",e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm disabled:bg-gray-100" style={{borderColor:(form.granel||form.volumes)?"#E3E7EB":"#BFD3E6"}}/></label>
            </div>
          </div>
          <div className="flex justify-between mt-5">
            <button onClick={()=>setStep(3)} className="px-4 py-2.5 rounded-lg text-sm font-semibold border" style={{borderColor:"#E3E7EB",color:C.navy}}>Voltar</button>
            <button disabled={faltando.length>0} onClick={()=>setStep(5)} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{background:C.navy}}>{faltando.length>0?`Faltam ${faltando.length} campo(s)`:"Revisar"}</button>
          </div>
        </div>
      )}
      {step===5&&(
        <div>
          <h3 className="font-bold mb-3">Confira antes de enviar</h3>
          <div className="rounded-lg p-4 mb-4" style={{background:C.light}}>
            <Row k="Empresa (grupo)" v={ENTIDADES[form.unidade].label}/>
            <Row k="Perfil" v={`${PERFIS[form.perfil].label}${PERFIS[form.perfil].frete!=="—"?" ("+PERFIS[form.perfil].frete+")":""}`}/>
            <Row k="Data e horário" v={`${fmtBR(form.data)} · ${form.hora}${form.foraExpediente?" · FORA DO EXPEDIENTE":""}`}/>
            <Row k="Empresa / CNPJ" v={`${form.empresa} · ${form.cnpj}`}/>
            {op==="entrega"?<><Row k="NF-e" v={`${form.nfe} · ${form.anexoNfe}`}/><Row k="Pedido de Compra" v={form.pedidoCompra}/></>:<><Row k="Pedido de venda" v={form.pedidoVenda}/><Row k="Transportadora" v={form.transportadora}/></>}
            <Row k="Carga" v={`${form.pesoKg} kg · ${form.granel?"Granel":form.volumes+" vol."} · ${form.tipoDescarregamento}`}/>
            <Row k="Veículo / Placa" v={`${form.tipoVeiculo} · ${form.placa}`}/>
            <Row k="Tel. motorista" v={form.telefone}/>
          </div>
          {form.foraExpediente&&<div className="mb-4 text-sm px-3 py-2 rounded-lg flex items-center gap-2 font-semibold" style={{background:"#F0E6FA",color:C.purple}}><ShieldCheck size={15}/> Horário fora do expediente — exige autorização da Gerência S&OP.</div>}
          <div className="flex justify-between">
            <button onClick={()=>setStep(4)} className="px-4 py-2.5 rounded-lg text-sm font-semibold border" style={{borderColor:"#E3E7EB",color:C.navy}}>Voltar</button>
            <button onClick={enviar} disabled={saving} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60" style={{background:C.orange}}>
              {saving?<><RotateCcw size={15} className="animate-spin"/> Salvando...</>:<><Send size={15}/> Enviar solicitação</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SlotRow({hora,weekDates,tISO,remaining,form,setForm,fora}){
  return(
    <div className="grid grid-cols-6 gap-1 mb-1">
      <div className="text-xs flex items-center justify-end pr-2 font-medium" style={{color:fora?C.purple:C.gray}}>{hora}</div>
      {weekDates.map(data=>{const past=data<tISO;const rem=remaining(data,hora);const sel=form.data===data&&form.hora===hora;const livre=!past&&rem>0;return(
        <button key={data+hora} disabled={!livre} onClick={()=>setForm(f=>({...f,data,hora,foraExpediente:fora}))} className="rounded-md py-2 text-xs font-semibold disabled:cursor-not-allowed transition-colors" style={{background:sel?(fora?C.purple:C.orange):livre?(fora?"#F4ECFB":"#E7F5EC"):"#EDEFF1",color:sel?"#fff":livre?(fora?C.purple:C.green):"#C2C2BD"}}>{livre?rem:"—"}</button>
      )})}
    </div>
  )
}

// ── Acompanhar ────────────────────────────────────────────
function Acompanhar({bookings,filterEmpresa}){
  const base=filterEmpresa?bookings.filter(b=>b.empresa===filterEmpresa):bookings
  const lista=base.slice().sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora))
  const[sel,setSel]=useState(lista[0]?.id||"")
  const[busca,setBusca]=useState("")
  const found=busca?base.find(b=>b.protocolo?.toLowerCase()===busca.trim().toLowerCase()):null
  const b=found||base.find(x=>x.id===sel)||lista[0]
  const LABEL={pendente:"Aguardando aprovação de data",confirmado:"Data confirmada",reagendado:"Nova data sugerida",na_portaria:"Na portaria",em_patio:"No pátio",operando:"Em operação",finalizado:"Finalizado",cancelado:"Recusada / cancelada",noshow:"Não compareceu"}
  return(
    <div>
      {filterEmpresa&&<div className="bg-white rounded-xl p-3 shadow-sm mb-3 text-xs flex items-center gap-2" style={{color:C.gray}}><Lock size={13} color={C.cyan}/> Você está vendo apenas os agendamentos de <b style={{color:C.navy}}>&nbsp;{filterEmpresa}</b>.</div>}
      <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{borderColor:"#E3E7EB"}}><Search size={15} color={C.gray}/><input placeholder="Buscar pelo protocolo (ex: AG-123456)" value={busca} onChange={e=>setBusca(e.target.value)} className="flex-1 text-sm outline-none"/></div>
      </div>
      <div className="text-xs font-semibold mb-2" style={{color:C.gray}}>MEUS AGENDAMENTOS</div>
      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        {lista.length===0&&<div className="bg-white rounded-xl p-5 text-center text-sm shadow-sm sm:col-span-2" style={{color:C.gray}}>Nenhum agendamento ainda.</div>}
        {lista.slice(0,12).map(x=>{const u=ENTIDADES[x.unidade];const sm=STATUS_META[x.status];const I=u?.icon||Truck;const on=(found?found.id:sel)===x.id;return(
          <button key={x.id} onClick={()=>{setSel(x.id);setBusca("")}} className="bg-white rounded-xl p-3 shadow-sm text-left transition-all hover:shadow-md" style={{boxShadow:on?`0 0 0 2px ${sm.color}`:undefined}}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold text-sm"><span className="rounded-md p-1" style={{background:(u?.color||C.navy)+"15"}}><I size={14} color={u?.color||C.navy}/></span>{x.protocolo}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:sm.bg,color:sm.color}}>{LABEL[x.status]}</span>
            </div>
            <div className="text-[11px] mt-1.5" style={{color:C.gray}}>{u?.label||""} · {fmtBR(x.data)} {x.hora} · Placa {x.placa}{x.foraExpediente?" · fora do expediente":""}</div>
          </button>)})}
      </div>
      {b&&<TrackCard b={b}/>}
    </div>
  )
}

function TrackCard({b}){
  const u=ENTIDADES[b.unidade]||{label:"",icon:Truck,color:C.navy};const sm=STATUS_META[b.status];const I=u.icon
  const cur=stageIdx(b.status);const terminal=b.status==="cancelado"||b.status==="noshow"
  const liquido=b.pesoTara&&b.pesoBruto?b.pesoBruto-b.pesoTara:null
  const times={na_portaria:b.chegadaReal,em_patio:b.entrada,finalizado:b.saida}
  return(
    <div className="bg-white rounded-xl p-5 shadow-sm" style={{animation:"fadeUp .4s ease both"}}>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-3"><div className="rounded-lg p-2.5" style={{background:u.color+"15"}}><I size={22} color={u.color}/></div>
          <div><div className="font-bold flex items-center gap-2 flex-wrap">{b.empresa}<span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:sm.bg,color:sm.color}}>{sm.label}</span>{b.foraExpediente&&<span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{background:"#F0E6FA",color:C.purple}}>Fora expediente</span>}</div>
            <div className="text-xs mt-0.5" style={{color:C.gray}}>{b.protocolo} · {u.label} · Placa <b style={{color:C.navy}}>{b.placa}</b> · {fmtBR(b.data)} {b.hora}</div>
            <div className="text-[11px] mt-0.5" style={{color:C.gray}}>{b.pesoKg} kg · {b.granel?"Granel":b.volumes+" volumes"} · {b.tipoDescarregamento}</div></div></div>
      </div>
      {terminal?<div className="rounded-lg p-4 text-center text-sm font-semibold" style={{background:sm.bg,color:sm.color}}>{b.status==="noshow"?"Veículo não compareceu na janela agendada.":"Agendamento cancelado."}</div>
      :(<div className="relative pl-2">{STAGES.map((s,i)=>{const done=i<=cur;const isCur=i===cur;const SI=s.icon;const tm=times[s.k];return(
        <div key={s.k} className="flex gap-3 pb-5 last:pb-0 relative">
          {i<STAGES.length-1&&<div className="absolute left-[15px] top-8 bottom-0 w-0.5" style={{background:i<cur?C.green:"#E3E7EB"}}/>}
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10" style={{background:done?(isCur?C.orange:C.green):"#EDEFF1"}}><SI size={15} color={done?"#fff":"#B7BFC6"}/></div>
          <div className="flex-1 pt-1"><div className="text-sm font-semibold flex items-center gap-2" style={{color:done?C.navy:"#B7BFC6"}}>{s.label}{isCur&&<span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:"#FDF0E4",color:C.orange,animation:"pulseSoft 1.6s infinite"}}>agora</span>}</div>{tm&&<div className="text-xs mt-0.5" style={{color:C.gray}}>{tm}</div>}</div>
        </div>)})}
      </div>)}
      {(b.pesoTara||b.pesoBruto)&&(<div className="mt-4 rounded-lg p-4" style={{background:C.light}}>
        <div className="text-xs font-semibold flex items-center gap-1 mb-2" style={{color:C.navy}}><Scale size={14} color={C.gray}/> Pesagem (balança)</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-[11px]" style={{color:C.gray}}>Tara</div><div className="font-bold text-sm">{b.pesoTara?(b.pesoTara/1000).toFixed(1)+" t":"—"}</div></div>
          <div><div className="text-[11px]" style={{color:C.gray}}>Bruto</div><div className="font-bold text-sm">{b.pesoBruto?(b.pesoBruto/1000).toFixed(1)+" t":"—"}</div></div>
          <div><div className="text-[11px]" style={{color:C.gray}}>Líquido</div><div className="font-bold text-sm" style={{color:C.green}}>{liquido?(liquido/1000).toFixed(1)+" t":"—"}</div></div>
        </div></div>)}
    </div>
  )
}

// ── Portaria ──────────────────────────────────────────────
function Portaria({bookings,updB}){
  const fila=bookings.filter(b=>["confirmado","reagendado","na_portaria","em_patio","operando"].includes(b.status)).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora))
  return(
    <div>
      <div className="bg-white rounded-xl p-3 shadow-sm mb-4 text-xs flex items-center gap-2" style={{color:C.gray}}><Lock size={14} color={C.orange}/> A portaria libera a entrada assim que o <b style={{color:C.navy}}>&nbsp;agendamento está confirmado</b>.</div>
      <div className="space-y-2">{fila.length===0&&<div className="bg-white rounded-xl p-6 text-center text-sm shadow-sm" style={{color:C.gray}}>Nenhum veículo previsto no momento.</div>}{fila.map(b=><PortariaCard key={b.id} b={b} updB={updB}/>)}</div>
    </div>
  )
}
function PortariaCard({b,updB}){
  const u=ENTIDADES[b.unidade]||{label:"",icon:Truck,color:C.navy};const sm=STATUS_META[b.status];const I=u.icon
  const[tara,setTara]=useState(b.pesoTara||"");const[bruto,setBruto]=useState(b.pesoBruto||"")
  return(
    <div className="bg-white rounded-xl p-3 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3"><div className="rounded-lg p-2 mt-0.5" style={{background:u.color+"15"}}><I size={18} color={u.color}/></div>
          <div><div className="font-semibold text-sm flex items-center gap-2 flex-wrap">{b.empresa}<span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:sm.bg,color:sm.color}}>{sm.label}</span></div>
            <div className="text-xs mt-0.5" style={{color:C.gray}}>{u.label} · Placa <b style={{color:C.navy}}>{b.placa}</b> · {b.operacao==="entrega"?"↓ Recebimento":"↑ Expedição"} · {b.hora}</div>
            {b.chegadaReal&&<div className="text-[11px] mt-0.5" style={{color:C.gray}}>Chegou {b.chegadaReal}{b.entrada&&` · Entrou ${b.entrada}`}</div>}</div></div>
        <div className="flex gap-1.5 flex-wrap">
          {(b.status==="confirmado"||b.status==="reagendado")&&<Btn onClick={()=>updB(b.id,{status:"na_portaria",chegadaReal:nowHM()})} color="#2C7BE5" icon={MapPin}>Registrar chegada</Btn>}
          {b.status==="na_portaria"&&<Btn onClick={()=>updB(b.id,{status:"em_patio",entrada:nowHM()})} color={C.navy2} icon={LogIn}>Liberar entrada</Btn>}
          {b.status==="em_patio"&&<Btn onClick={()=>updB(b.id,{status:"operando"})} color={C.orange} icon={Boxes}>Iniciar operação</Btn>}
        </div>
      </div>
      {b.status==="operando"&&(<div className="mt-3 pt-3 border-t flex items-end gap-2 flex-wrap" style={{borderColor:"#E3E7EB"}}>
        <label className="text-xs">Tara (kg)<input type="number" value={tara} onChange={e=>setTara(e.target.value)} className="block w-24 px-2 py-1.5 rounded border text-sm mt-1" style={{borderColor:"#E3E7EB"}}/></label>
        <label className="text-xs">Bruto (kg)<input type="number" value={bruto} onChange={e=>setBruto(e.target.value)} className="block w-24 px-2 py-1.5 rounded border text-sm mt-1" style={{borderColor:"#E3E7EB"}}/></label>
        <div className="text-xs">Líquido<div className="font-bold text-sm pt-1.5" style={{color:C.green}}>{tara&&bruto?((bruto-tara)/1000).toFixed(1)+" t":"—"}</div></div>
        <Btn onClick={()=>updB(b.id,{status:"finalizado",pesoTara:Number(tara)||null,pesoBruto:Number(bruto)||null,saida:nowHM()})} color={C.green} icon={Flag}>Finalizar e registrar saída</Btn>
      </div>)}
    </div>
  )
}

// ── Painel ────────────────────────────────────────────────
function Painel({bookings,cap,updateCap,updB,weekDates,weekOffset,setWeekOffset,canAuthorize}){
  const[filtro,setFiltro]=useState("pendente")
  const[reagId,setReagId]=useState(null);const[reagData,setReagData]=useState({data:"",hora:""})
  const[toast,setToast]=useState(null)
  const ws0=getWeekStart(0)
  function notify(empresa,msg){setToast({empresa,msg});setTimeout(()=>setToast(null),3200)}
  function act(id,patch,empresa,msg){updB(id,patch);notify(empresa,msg)}
  const all=bookings
  const finalizados=all.filter(b=>b.status==="finalizado")
  const noshow=all.filter(b=>b.status==="noshow").length
  const cancelado=all.filter(b=>b.status==="cancelado").length
  const pendAll=all.filter(b=>b.status==="pendente").length
  const operandoNow=all.filter(b=>["na_portaria","em_patio","operando"].includes(b.status)).length
  const comChegada=all.filter(b=>b.chegadaReal)
  const pontuais=comChegada.filter(b=>slotMin(b.chegadaReal)-slotMin(b.hora)<=30).length
  const pontualidade=comChegada.length?Math.round((pontuais/comChegada.length)*100):0
  const noshowRate=(finalizados.length+noshow)?Math.round((noshow/(finalizados.length+noshow))*100):0
  const pesoT=finalizados.reduce((s,b)=>s+((b.pesoBruto&&b.pesoTara)?(b.pesoBruto-b.pesoTara):(b.pesoKg||0)),0)/1000
  const semAtivos=all.filter(b=>weekDates.includes(b.data)&&ATIVOS.includes(b.status)).length
  const ocup=cap>0?Math.min(100,Math.round((semAtivos/(45*cap))*100)):0
  const foraPend=all.filter(b=>b.foraExpediente&&b.status==="pendente"&&!b.autorizada)
  const porUnidade=Object.entries(ENTIDADES).map(([k,u])=>({name:u.label,qtd:all.filter(b=>b.unidade===k&&b.status!=="cancelado").length,fill:u.color}))
  const porStatus=[
    {name:"Pendente",value:pendAll,fill:C.orange},{name:"Confirm./andamento",value:all.filter(b=>["confirmado","reagendado","na_portaria","em_patio","operando"].includes(b.status)).length,fill:C.cyan},
    {name:"Finalizado",value:finalizados.length,fill:C.green},{name:"No-show",value:noshow,fill:C.red},{name:"Cancelado",value:cancelado,fill:C.gray},
  ].filter(d=>d.value>0)
  const semanal=[];for(let wk=-6;wk<=1;wk++){const inWk=all.filter(b=>Math.round((parseISO(b.data)-ws0)/604800000)===wk);semanal.push({semana:fmtBR(fmtISO(addDays(ws0,wk*7))),agendamentos:inWk.length,finalizados:inWk.filter(b=>b.status==="finalizado").length})}
  const KPIS=[
    {label:"Total (hist.)",value:all.length,color:C.navy,icon:BarChart3},
    {label:"Finalizados",value:finalizados.length,color:C.green,icon:CheckCircle2},
    {label:"Pendentes",value:pendAll,color:C.orange,icon:Clock},
    {label:"Em operação",value:operandoNow,color:"#2C7BE5",icon:Activity},
    {label:"Ocupação (sem.)",value:ocup,suffix:"%",color:C.navy2,icon:Target},
    {label:"Pontualidade",value:pontualidade,suffix:"%",color:C.green,icon:CheckCircle2},
    {label:"No-show",value:noshowRate,suffix:"%",color:C.red,icon:AlertTriangle},
    {label:"Peso movim.",value:pesoT,decimals:1,suffix:" t",color:C.cyan,icon:Weight},
  ]
  const lista=all.filter(b=>filtro==="todos"?true:filtro==="ativos"?ATIVOS.includes(b.status):filtro==="fora"?b.foraExpediente:b.status===filtro).sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora))
  return(
    <div>
      {toast&&<div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white" style={{background:C.green,animation:"fadeUp .3s ease both"}}><Mail size={16}/> Notificação enviada para {toast.empresa} · <span className="font-normal opacity-90">{toast.msg}</span></div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">{KPIS.map((k,i)=><KpiCard key={k.label} {...k} i={i}/>)}</div>
      {foraPend.length>0&&<div className="rounded-xl p-3 mb-4 text-sm flex items-center gap-2 font-semibold" style={{background:"#F0E6FA",color:C.purple,animation:"fadeUp .5s ease both"}}><ShieldCheck size={16}/> {foraPend.length} agendamento(s) FORA DO EXPEDIENTE aguardando autorização da Gerência S&OP.</div>}
      <div className="grid lg:grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm lg:col-span-2" style={{animation:"fadeUp .5s ease both"}}>
          <div className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} color={C.cyan}/> Movimentação por semana</div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={semanal} margin={{top:5,right:10,left:-18,bottom:0}}>
              <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.cyan} stopOpacity={0.35}/><stop offset="100%" stopColor={C.cyan} stopOpacity={0.02}/></linearGradient><linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.3}/><stop offset="100%" stopColor={C.green} stopOpacity={0.02}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4"/><XAxis dataKey="semana" tick={{fontSize:11,fill:C.gray}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:C.gray}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{borderRadius:10,border:"1px solid #E3E7EB",fontSize:12}}/>
              <Area type="monotone" dataKey="agendamentos" name="Agendamentos" stroke={C.cyan} strokeWidth={2.5} fill="url(#gA)"/>
              <Area type="monotone" dataKey="finalizados" name="Finalizados" stroke={C.green} strokeWidth={2} fill="url(#gF)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{animation:"fadeUp .5s ease both",animationDelay:"80ms"}}>
          <div className="text-sm font-bold mb-3 flex items-center gap-2"><Package size={16} color={C.green}/> Agendamentos por empresa</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porUnidade} margin={{top:5,right:10,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false}/>
              <XAxis dataKey="name" tick={{fontSize:11,fill:C.gray}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:C.gray}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip cursor={{fill:"#F4F6F8"}} contentStyle={{borderRadius:10,border:"1px solid #E3E7EB",fontSize:12}}/>
              <Bar dataKey="qtd" name="Agendamentos" radius={[6,6,0,0]}>{porUnidade.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{animation:"fadeUp .5s ease both",animationDelay:"140ms"}}>
          <div className="text-sm font-bold mb-3 flex items-center gap-2"><BarChart3 size={16} color={C.orange}/> Distribuição por status</div>
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="55%" height={180}><PieChart><Pie data={porStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>{porStatus.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip contentStyle={{borderRadius:10,border:"1px solid #E3E7EB",fontSize:12}}/></PieChart></ResponsiveContainer>
            <div className="flex-1 space-y-1.5">{porStatus.map(s=><div key={s.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5" style={{color:C.gray}}><span className="w-2.5 h-2.5 rounded-full" style={{background:s.fill}}/>{s.name}</span><b style={{color:C.navy}}>{s.value}</b></div>)}</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-3 shadow-sm mb-4"><div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold flex items-center gap-1"><Lock size={13} color={C.gray}/> Docas por horário (agenda compartilhada DND + DBL)</span>
        <label className="flex items-center gap-2 text-xs"><span>Veículos por horário</span><input type="number" min={1} max={9} value={cap} onChange={e=>updateCap(Math.max(1,parseInt(e.target.value)||1))} className="w-14 px-2 py-1 rounded border text-center" style={{borderColor:"#E3E7EB"}}/></label>
      </div><div className="text-[11px] mt-1.5" style={{color:C.gray}}>Agenda compartilhada (DND + DBL): cada horário reservado vale para todas as operações.</div></div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex gap-1.5 flex-wrap">{[["pendente","Pendentes"],["fora","Fora expediente"],["ativos","Ativos"],["finalizado","Finalizados"],["todos","Todos"]].map(([k,l])=><button key={k} onClick={()=>setFiltro(k)} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors" style={{background:filtro===k?C.navy:"#fff",color:filtro===k?"#fff":C.gray,border:"1px solid #E3E7EB"}}>{l}</button>)}</div>
        <div className="flex items-center gap-2 text-xs">
          <button onClick={()=>setWeekOffset(w=>w-1)} className="p-1.5 rounded-md border bg-white" style={{borderColor:"#E3E7EB"}}><ChevronLeft size={14}/></button>
          <span style={{color:C.gray}}>{fmtBR(weekDates[0])}–{fmtBR(weekDates[4])}</span>
          <button onClick={()=>setWeekOffset(w=>w+1)} className="p-1.5 rounded-md border bg-white" style={{borderColor:"#E3E7EB"}}><ChevronRight size={14}/></button>
        </div>
      </div>
      <div className="space-y-2">{lista.length===0&&<div className="bg-white rounded-xl p-6 text-center text-sm shadow-sm" style={{color:C.gray}}>Nenhuma solicitação neste filtro.</div>}
        {lista.slice(0,40).map(b=>{const u=ENTIDADES[b.unidade]||{label:"",icon:Truck,color:C.navy};const sm=STATUS_META[b.status];const I=u.icon;const precisaAuth=b.foraExpediente&&!b.autorizada&&b.status==="pendente";return(
          <div key={b.id} className="bg-white rounded-xl p-3 shadow-sm transition-all hover:shadow-md" style={precisaAuth?{boxShadow:"0 0 0 2px #E5D2F5"}:{}}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3"><div className="rounded-lg p-2 mt-0.5" style={{background:u.color+"15"}}><I size={18} color={u.color}/></div>
                <div><div className="font-semibold text-sm flex items-center gap-2 flex-wrap">{b.empresa}<span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:sm.bg,color:sm.color}}>{sm.label}</span>{b.foraExpediente&&<span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{background:"#F0E6FA",color:C.purple}}>Fora expediente</span>}{b.frete!=="—"&&<span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{background:b.frete==="FOB"?"#FDE9D6":"#DDEBF7",color:b.frete==="FOB"?C.orange:"#2C7BE5"}}>{b.frete}</span>}</div>
                  <div className="text-xs mt-0.5" style={{color:C.gray}}>{b.protocolo} · {u.label} · {PERFIS[b.perfil]?.label||b.perfil} · <b style={{color:C.navy}}>{fmtBR(b.data)} {b.hora}</b></div>
                  <div className="text-[11px] mt-0.5" style={{color:C.gray}}>{b.pesoKg} kg · {b.granel?"Granel":b.volumes+" vol."} · {b.tipoDescarregamento} · Placa {b.placa}</div></div></div>
              <div className="flex gap-1.5 flex-wrap items-center">
                {precisaAuth&&canAuthorize&&<Btn onClick={()=>act(b.id,{status:"confirmado",autorizada:true},b.empresa,"horário fora do expediente autorizado")} color={C.purple} icon={ShieldCheck}>Autorizar (S&OP)</Btn>}
                {precisaAuth&&!canAuthorize&&<span className="text-[10px] px-2 py-1 rounded-md font-semibold" style={{background:"#F0E6FA",color:C.purple}}>Aguardando S&OP</span>}
                {b.status==="pendente"&&!precisaAuth&&<Btn onClick={()=>act(b.id,{status:"confirmado"},b.empresa,"agendamento confirmado")} color={C.green} icon={CheckCircle2}>Confirmar</Btn>}
                {["pendente","confirmado","reagendado"].includes(b.status)&&<Btn onClick={()=>{setReagId(reagId===b.id?null:b.id);setReagData({data:b.data,hora:b.hora})}} color={C.cyan} icon={RotateCcw}>Reagendar</Btn>}
                {["confirmado","reagendado"].includes(b.status)&&<Btn onClick={()=>act(b.id,{status:"noshow"},b.empresa,"registrado como no-show")} color={C.red} icon={AlertTriangle}>No-show</Btn>}
                {ATIVOS.includes(b.status)&&<Btn onClick={()=>act(b.id,{status:"cancelado"},b.empresa,"agendamento cancelado")} color={C.gray} icon={XCircle}>Cancelar</Btn>}
              </div>
            </div>
            {reagId===b.id&&(<div className="mt-3 pt-3 border-t flex items-end gap-2 flex-wrap" style={{borderColor:"#E3E7EB"}}>
              <label className="text-xs">Nova data<input type="date" value={reagData.data} onChange={e=>setReagData(d=>({...d,data:e.target.value}))} className="block px-2 py-1.5 rounded border text-sm mt-1" style={{borderColor:"#E3E7EB"}}/></label>
              <label className="text-xs">Horário<select value={reagData.hora} onChange={e=>setReagData(d=>({...d,hora:e.target.value}))} className="block px-2 py-1.5 rounded border text-sm mt-1" style={{borderColor:"#E3E7EB"}}>{[...SLOTS,...EXTRA_SLOTS].map(s=><option key={s}>{s}</option>)}</select></label>
              <button onClick={()=>{act(b.id,{data:reagData.data,hora:reagData.hora,status:"reagendado"},b.empresa,`nova data sugerida: ${fmtBR(reagData.data)} ${reagData.hora}`);setReagId(null)}} className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{background:C.cyan}}>Aplicar e sugerir</button>
            </div>)}
          </div>)})}
      </div>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────
function StepDots({step}){
  const labels=["Empresa","Perfil","Janela","Dados","Revisão"]
  return(<div className="flex items-center justify-between mb-5">{labels.map((l,i)=>{const n=i+1,active=step>=n;return(
    <div key={l} className="flex items-center flex-1 last:flex-none">
      <div className="flex flex-col items-center"><div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors" style={{background:active?C.orange:"#C7CFD6"}}>{n}</div><span className="text-[10px] mt-1" style={{color:active?C.navy:C.gray}}>{l}</span></div>
      {i<labels.length-1&&<div className="flex-1 h-0.5 mx-1 mb-4" style={{background:step>n?C.orange:"#C7CFD6"}}/>}
    </div>)})}
  </div>)
}
function Field({label,icon:I,v,on,disabled}){return<label className="block"><span className="text-xs font-medium flex items-center gap-1 mb-1" style={{color:C.navy}}><I size={13} color={C.gray}/> {label}{disabled&&<Lock size={10} color={C.gray}/>}</span><input value={v} onChange={e=>on(e.target.value)} disabled={disabled} readOnly={disabled} className="w-full px-3 py-2 rounded-lg text-sm outline-none border disabled:bg-gray-100" style={{borderColor:v?"#E3E7EB":"#BFD3E6"}}/></label>}
function FileField({label,v,on}){return(<label className="block cursor-pointer"><span className="text-xs font-medium flex items-center gap-1 mb-1" style={{color:C.navy}}><Paperclip size={13} color={C.gray}/> {label}</span><div className="w-full px-3 py-2 rounded-lg text-sm border flex items-center justify-between" style={{borderColor:v?"#E3E7EB":"#BFD3E6",color:v?C.navy:C.gray}}><span className="truncate">{v||"Selecionar arquivo..."}</span><Paperclip size={14} color={C.gray}/><input type="file" className="hidden" onChange={e=>on(e.target.files?.[0]?.name||"")}/></div></label>)}
function Row({k,v}){return<div className="flex justify-between py-1 text-sm border-b last:border-0" style={{borderColor:"#E3E7EB"}}><span style={{color:C.gray}}>{k}</span><span className="font-medium text-right ml-3">{v||"—"}</span></div>}
function Btn({onClick,color,icon:I,children}){return<button onClick={onClick} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:brightness-95" style={{background:color+"15",color}}><I size={13}/> {children}</button>}
