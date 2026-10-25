import React from 'react';
import {SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import EvaluationLab from './eval/EvaluationLab';

export default function App(){
 return <SafeAreaView style={styles.safe}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
   <Text style={styles.heading}>Pet Challenge Evaluation Lab</Text>
   <Text style={styles.subtitle}>Automated synthetic scenarios · Apple on-device LLM · Expo SDK 58 target</Text>
   <EvaluationLab/>
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#f8fafc'},container:{padding:18,gap:16},heading:{fontSize:24,fontWeight:'bold'},subtitle:{color:'#596574'}});
