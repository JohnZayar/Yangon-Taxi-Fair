const base=2500,kmRate=1200,waitRate=100;
document.getElementById('calc').onclick=()=>{
 let km=Number(document.getElementById('km').value);
 let w=Number(document.getElementById('wait').value||0);
 if(!km){alert('KM ထည့်ပါ');return;}
 let total=base+(km*kmRate)+(w*waitRate);
 document.getElementById('price').innerText=Math.round(total).toLocaleString()+" Ks";
 document.getElementById('info').innerText=`${km} km + Waiting ${w} မိနစ်`;
};