import React,{useEffect,useState} from 'react';
import {isFoundationModelsEnabled} from 'react-native-apple-llm';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import EvaluationLab from './eval/EvaluationLab';

export default function App(){
 const [modelStatus,setModelStatus]=useState('Checking Apple Foundation Models...');
 useEffect(()=>{
  let active=true;
  async function checkModel(){
   try{
    const status=String(await isFoundationModelsEnabled());
    console.log('[AppleLLM] FOUNDATION MODEL AVAILABILITY:',status);
    if(active)setModelStatus('Apple Foundation Models: '+status);
   }catch(e){
    console.error('[AppleLLM] AVAILABILITY CHECK ERROR:',e);
    if(active)setModelStatus('Apple Foundation Models check failed: '+String(e));
   }
  }
  void checkModel();
  return ()=>{active=false;};
 },[]);
 return <View style={styles.safe}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
   <Text style={styles.heading}>Pet Challenge Evaluation Lab</Text>
   <Text style={styles.subtitle}>Automated synthetic scenarios · Apple on-device LLM · Expo SDK 58 target</Text>
   <Text selectable style={styles.status}>{modelStatus}</Text>
   <EvaluationLab/>
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#f8fafc'},container:{padding:18,gap:16},heading:{fontSize:24,fontWeight:'bold'},subtitle:{color:'#596574'},status:{padding:10,backgroundColor:'#e2e8f0',borderRadius:6}});
