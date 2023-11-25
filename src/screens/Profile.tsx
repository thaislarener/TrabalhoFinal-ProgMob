import { Center, Heading, ScrollView, Skeleton, Text, useToast, VStack } from 'native-base';
import { useForm, Controller } from 'react-hook-form';
import { TouchableOpacity } from 'react-native';
import { useState } from 'react';

import * as yup from 'yup';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@hooks/useAuth';
import { yupResolver } from '@hookform/resolvers/yup';

import { api } from '@services/api';
import { AppError } from '@utils/AppError';
import defaultUserPhotoImg from '@assets/userPhotoDefault.png';


import { Input } from '@components/Input';
import { Button } from '@components/Button';
import { UserPhoto } from '@components/UserPhoto';
import { ScreenHeader } from '@components/ScreenHeader';

type FormDataProps = {
    name: string;
    email: string;
    password: string;
    old_password: string;
    confirm_password: string;
}

const profileSchema = yup.object({
    name: yup.string().required('Informe o nome.'),
    new_password: yup
    .string()
    .min(6, 'A senha deve ter pelo menos 6 dígitos.')
    .nullable()
    .transform((value) => !!value ? value : null),
    confirm_password: yup
    .string()
    .nullable()
    .transform((value) => !!value ? value : null)
    .oneOf([yup.ref('password')], 'As senhas não conferem.')
    .when('password',{ 
        is: (Fiel: any) => Fiel, 
        then: (schema) => schema.nullable().required('Confirme a senha')
    })
});

const PHOTO_SIZE = 33;

export function Profile(){
    const toast = useToast();

    const [isUpdating, setIsUpdating] = useState(false);
    const [photoIsLoading, setPhotoIsLoading] = useState(false);

    const { user, updateUserProfile } = useAuth();
    const { control, handleSubmit, formState: { errors } } = useForm<FormDataProps>({
        defaultValues:{
            name: user.name,
            email: user.email,
        },            
        resolver: yupResolver(profileSchema)
    });

    async function handleUserPhotoSelect(){
        setPhotoIsLoading(true);
        try{
            const photoSelected = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
                aspect: [4, 4],
                allowsEditing: true
            });
            
            if(photoSelected.canceled)
                return;
            
            if(photoSelected.assets[0].uri){ 
                if(photoSelected.assets[0].fileSize && (photoSelected.assets[0].fileSize / 1024 / 1024) > 5){
                    return toast.show({
                        title: 'Essa imagem é muito grande. Escolha uma de até 5MB.',
                    placement: 'top',
                    bgColor: 'red.500'
                    })
                }

                const fileExtension = photoSelected.assets[0].uri.split('.').pop();
                const photoFile = {
                    name: `${user.name}.${fileExtension}`.toLowerCase(),
                    uri: photoSelected.assets[0].uri,
                    type: `${photoSelected.assets[0].type}/${fileExtension}`
                } as any;
                const userPhotoUploadForm = new FormData();
                userPhotoUploadForm.append('avatar', photoFile);
                
                const avatarUpdatedResponse = await api.patch('/users/avatar', userPhotoUploadForm, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                const userUpdated = user;
                userUpdated.avatar = avatarUpdatedResponse.data.avatar;
                updateUserProfile(userUpdated);
                //setUserPhoto(photoSelected.assets[0].uri);

                toast.show({
                    title: 'Foto atualizada!',
                    placement: 'top',
                    bgColor: 'green.500'
                });
            }
        }
        catch(error){
            console.log(error);
        }
        finally{
            setPhotoIsLoading(false);
        }
    }

    async function handleProfileUpdate(data: FormDataProps){
        try{
            setIsUpdating(true);

            const userUpdated = user;
            userUpdated.name = data.name;

            await api.put('/users', data);

            await -updateUserProfile(userUpdated);

            toast.show({
                title: 'Perfil atualizado com sucesso',
                placement: 'top',
                bgColor: 'green.500'
            })
        }
        catch(error){
            const isAppError = error instanceof AppError;
            const title = isAppError ? error.message : 'Não foi possível atualizar os dados. Tente novamente mais tarde';

            toast.show({
                title,
                placement: 'top',
                bgColor: 'red.500'
            })
        }
        finally{
            setIsUpdating(false);
        }
    }

    return(
        <VStack flex={1}>
            <ScreenHeader title='Perfil'/>

            <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
                <Center mt={6} px={10}>
                    {
                        photoIsLoading ? 
                        <Skeleton 
                            w={PHOTO_SIZE} 
                            h={PHOTO_SIZE} 
                            rounded='full'
                            startColor='gray.500'
                            endColor='gray.400'
                        />
                        :
                        <UserPhoto
                        source={
                            user.avatar 
                                ? { uri: `${api.defaults.baseURL}/avatar/${user.avatar}`} 
                                : defaultUserPhotoImg}
                            alt='Foto do usuário'
                            size={PHOTO_SIZE}
                        />
                    }

                    <TouchableOpacity onPress={handleUserPhotoSelect}>
                        <Text color='green.500' fontWeight='bold' fontSize='md' mt={2} mb={6} >
                            Alterar foto
                        </Text>
                    </TouchableOpacity>

                    <Controller 
                        control={control}
                        name='name'
                        render={({ field: {onChange, value}}) => (
                            <Input 
                                placeholder='Nome'
                                bg='gray.600'
                                onChangeText={onChange}
                                value={value}
                                errorMessage={errors.name?.message}
                            />
                        )}
                    />

                    <Controller 
                        control={control}
                        name='email'
                        render={({ field: {onChange, value}}) => (
                            <Input 
                                placeholder='E-mail'
                                isDisabled
                                bg='gray.600'
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />

                </Center>
                
                <VStack px={10} mt={12} mb={9}>
                    <Heading color='gray.200' fontSize='md' mb={2} fontFamily='heading'>
                        Alterar senha
                    </Heading>

                    <Controller 
                        control={control}
                        name='old_password'
                        render={({ field: { onChange }}) => (
                            <Input 
                                placeholder='Senha antiga'
                                bg='gray.600'
                                secureTextEntry
                                onChangeText={onChange}
                            />
                        )}
                    />

                    <Controller 
                        control={control}
                        name='password'
                        render={({ field: { onChange, value }}) => (
                            <Input 
                                placeholder='Nova senha'
                                bg='gray.600'
                                secureTextEntry
                                onChangeText={onChange}
                                value={value}
                                errorMessage={errors.password?.message}
                            />
                        )}
                    />

                    <Controller 
                        control={control}
                        name='confirm_password'
                        render={({ field: { onChange, value }}) => (
                            <Input 
                                placeholder='Confirme a  nova senha'
                                bg='gray.600'
                                secureTextEntry
                                onChangeText={onChange}
                                value={value}
                                onSubmitEditing={handleSubmit(handleProfileUpdate)}
                                returnKeyType='send'
                                errorMessage={errors.confirm_password?.message}
                            />
                        )}
                    />

                    <Button
                        title='Atualizar'
                        mt={4}
                        onPress={handleSubmit(handleProfileUpdate)}
                            isLoading={isUpdating}
                    />
                </VStack>
            </ScrollView>
        </VStack>
    );
}