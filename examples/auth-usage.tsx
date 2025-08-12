import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

// Example Signup Component
export const SignupExample = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'client' | 'trainer'>('client');
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, {
        name,
        phone,
        email,
        role,
        bio: role === 'trainer' ? 'Professional trainer' : '',
        specializations: role === 'trainer' ? ['General Fitness'] : [],
        experience_years: role === 'trainer' ? 1 : 0,
      });
      
      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      Alert.alert('Signup Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => setRole('client')}
          style={{
            padding: 10,
            backgroundColor: role === 'client' ? '#007AFF' : '#f0f0f0',
            marginRight: 10,
            borderRadius: 5,
          }}
        >
          <Text style={{ color: role === 'client' ? 'white' : 'black' }}>
            Client
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRole('trainer')}
          style={{
            padding: 10,
            backgroundColor: role === 'trainer' ? '#007AFF' : '#f0f0f0',
            borderRadius: 5,
          }}
        >
          <Text style={{ color: role === 'trainer' ? 'white' : 'black' }}>
            Trainer
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleSignup}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#ccc' : '#007AFF',
          padding: 15,
          borderRadius: 5,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Example Signin Component
export const SigninExample = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, userProfile, isTrainer, isClient } = useAuth();

  const handleSignin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      
      // The profile will be automatically fetched by the context
      // You can access role-based logic here
      setTimeout(() => {
        if (isTrainer) {
          Alert.alert('Welcome Trainer!', `Hello ${userProfile?.name}`);
          // Navigate to trainer dashboard
        } else if (isClient) {
          Alert.alert('Welcome Client!', `Hello ${userProfile?.name}`);
          // Navigate to client dashboard
        }
      }, 1000);
      
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />

      <TouchableOpacity
        onPress={handleSignin}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#ccc' : '#007AFF',
          padding: 15,
          borderRadius: 5,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      {userProfile && (
        <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0' }}>
          <Text>Logged in as: {userProfile.name}</Text>
          <Text>Role: {userProfile.role}</Text>
          <Text>Email: {userProfile.email}</Text>
        </View>
      )}
    </View>
  );
};