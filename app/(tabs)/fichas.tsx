import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Search, X, Trash2, Edit2, ChevronRight, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// Interface para as fichas
interface Ficha {
  id: number;
  nome_ficha: string;
  descricao: string | null;
  created_at: string;
  treinos_count?: number;
}

export default function FichasScreen() {
  const { colors } = useTheme();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAlunasAssociadasModal, setShowAlunasAssociadasModal] = useState(false);
  const [selectedFicha, setSelectedFicha] = useState<Ficha | null>(null);
  const [alunasAssociadas, setAlunasAssociadas] = useState<any[]>([]);
  const [loadingAlunas, setLoadingAlunas] = useState(false);
  const [newFicha, setNewFicha] = useState({
    nome: '',
    descricao: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Adicionar useFocusEffect para recarregar os dados quando a tela receber foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('Tela de fichas recebeu foco - Recarregando dados...');
      fetchFichas();
    }, [])
  );

  const fetchFichas = async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar todas as fichas
      const { data: fichasData, error: fichasError } = await supabase
        .from('fichas')
        .select('*')
        .order('nome_ficha');
      
      if (fichasError) throw fichasError;

      // Para cada ficha, buscar a contagem de treinos associados
      const fichasComContagem = await Promise.all(
        fichasData?.map(async (ficha) => {
          // Contar treinos associados a esta ficha
          const { data: treinosCount, error: countError } = await supabase
            .from('fichas_treino')
            .select('id', { count: 'exact', head: true })
            .eq('fichas_id', ficha.id);
          
          if (countError) {
            console.error(`Erro ao contar treinos para ficha ${ficha.id}:`, countError);
            return {
              ...ficha,
              treinos_count: 0
            };
          }
          
          return {
            ...ficha,
            treinos_count: treinosCount?.length || 0
          };
        }) || []
      );

      setFichas(fichasComContagem);
    } catch (error) {
      console.error('Erro ao buscar fichas:', error);
      setError('Não foi possível carregar as fichas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFicha = async () => {
    if (!newFicha.nome.trim()) {
      alert('O nome da ficha é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fichas')
        .insert([{
          nome_ficha: newFicha.nome,
          descricao: newFicha.descricao || null,
        }])
        .select();

      if (error) throw error;
      
      if (data) {
        // Adicionar treinos_count para manter consistência com o formato dos dados
        const newFichaWithCount = {
          ...data[0],
          treinos_count: 0
        };
        
        setFichas([newFichaWithCount, ...fichas]);
        setShowAddModal(false);
        setNewFicha({
          nome: '',
          descricao: '',
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar ficha:', error);
      alert('Erro ao adicionar ficha. Tente novamente.');
    }
  };

  const handleEditFicha = async () => {
    if (!selectedFicha || !newFicha.nome.trim()) {
      alert('O nome da ficha é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fichas')
        .update({
          nome_ficha: newFicha.nome,
          descricao: newFicha.descricao || null,
        })
        .eq('id', selectedFicha.id)
        .select();

      if (error) throw error;
      
      if (data) {
        // Atualizar a ficha na lista mantendo a contagem de treinos
        const updatedFichas = fichas.map(ficha => 
          ficha.id === selectedFicha.id 
            ? { ...data[0], treinos_count: ficha.treinos_count } 
            : ficha
        );
        
        setFichas(updatedFichas);
        setShowEditModal(false);
        setSelectedFicha(null);
        setNewFicha({
          nome: '',
          descricao: '',
        });
      }
    } catch (error) {
      console.error('Erro ao editar ficha:', error);
      alert('Erro ao editar ficha. Tente novamente.');
    }
  };

  const handleDeleteFicha = async (fichaId: number) => {
    try {
      // 1. Verificar se existem treinos associados a esta ficha
      const { data: treinosAssociados, error: treinosError } = await supabase
        .from('fichas_treino')
        .select('id')
        .eq('fichas_id', fichaId);
      
      if (treinosError) throw treinosError;
      
      // 2. Verificar se existem alunas associadas a esta ficha
      const { data: alunasAssociadas, error: alunasError } = await supabase
        .from('fichas_das_alunas')
        .select('id, id_aluna, data_inicio')
        .eq('id_fichas', fichaId);
      
      if (alunasError) throw alunasError;
      
      // Se houver treinos associados, mostrar aviso e não permitir exclusão
      if (treinosAssociados && treinosAssociados.length > 0) {
        alert('Esta ficha possui treinos associados. Remova os treinos primeiro.');
        return;
      }
      
      // Se houver alunas associadas, mostrar aviso e oferecer opção para gerenciar
      if (alunasAssociadas && alunasAssociadas.length > 0) {
        setAlunasAssociadas(alunasAssociadas);
        setShowAlunasAssociadasModal(true);
        return;
      }
      
      // Se não houver associações, continuar com a exclusão
      await excluirFicha(fichaId);
      
    } catch (error: any) {
      console.error('Erro ao excluir ficha:', error);
      
      // Mensagem mais amigável para erro de violação de chave estrangeira
      if (error.code === '23503') {
        alert('Esta ficha está sendo usada em outros lugares do sistema. Remova todas as associações antes de excluí-la.');
      } else {
        alert('Erro ao excluir ficha: ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  // Função para executar a exclusão da ficha
  const excluirFicha = async (fichaId: number) => {
    try {
      const { error } = await supabase
        .from('fichas')
        .delete()
        .eq('id', fichaId);
      
      if (error) throw error;
      
      // Atualizar a lista de fichas após exclusão bem-sucedida
      setFichas(fichas.filter(ficha => ficha.id !== fichaId));
      
      // Fechar qualquer modal aberto
      setShowDeleteModal(false);
      setShowAlunasAssociadasModal(false);
      setSelectedFicha(null);
      
    } catch (error: any) {
      console.error('Erro ao excluir ficha:', error);
      alert('Erro ao excluir ficha: ' + (error.message || 'Erro desconhecido'));
    }
  };

  // Função para remover todas as associações com alunas e excluir a ficha
  const removerAssociacoesEExcluir = async () => {
    if (!selectedFicha) return;
    
    try {
      setLoadingAlunas(true);
      
      // Remover todas as associações de alunas
      const { error } = await supabase
        .from('fichas_das_alunas')
        .delete()
        .eq('id_fichas', selectedFicha.id);
      
      if (error) throw error;
      
      // Excluir a ficha
      await excluirFicha(selectedFicha.id);
      
    } catch (error: any) {
      console.error('Erro ao remover associações:', error);
      alert('Erro ao remover associações: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoadingAlunas(false);
    }
  };

  const openEditModal = (ficha: Ficha) => {
    setSelectedFicha(ficha);
    setNewFicha({
      nome: ficha.nome_ficha,
      descricao: ficha.descricao || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (ficha: Ficha) => {
    setSelectedFicha(ficha);
    setShowDeleteModal(true);
  };

  const navigateToFichaDetails = (fichaId: number) => {
    // Navegar para a página de detalhes da ficha quando implementada
    router.push(`/ficha-details/${fichaId}`);
  };

  const renderFichaItem = ({ item }: { item: Ficha }) => (
    <TouchableOpacity 
      style={[styles.fichaCard, { backgroundColor: colors.card }]}
      onPress={() => navigateToFichaDetails(item.id)}
    >
      <View style={styles.fichaContent}>
        <View style={styles.fichaTitleContainer}>
          <FileText size={20} color={colors.primary} style={styles.fichaIcon} />
          <Text style={[styles.fichaTitle, { color: colors.text }]}>{item.nome_ficha}</Text>
        </View>
        
        {item.descricao && (
          <Text 
            style={[styles.fichaDescription, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.descricao}
          </Text>
        )}
        <View style={styles.fichaMetaContainer}>
          <Text style={[styles.fichaMetaText, { color: colors.textSecondary }]}>
            {item.treinos_count || 0} {item.treinos_count === 1 ? 'treino' : 'treinos'} associado{item.treinos_count !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={styles.fichaActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
            onPress={() => openEditModal(item)}
          >
            <Edit2 size={16} color="#3B82F6" />
            <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            onPress={() => openDeleteModal(item)}
          >
            <Trash2 size={16} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Excluir</Text>
          </TouchableOpacity>
          
          <View style={styles.detailsButton}>
            <Text style={[styles.detailsText, { color: colors.primary }]}>Ver Detalhes</Text>
            <ChevronRight size={16} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleDeleteConfirm = () => {
    if (!selectedFicha) return;
    
    handleDeleteFicha(selectedFicha.id);
    // Não fechamos o modal aqui, pois isso será feito dentro da função handleDeleteFicha 
    // dependendo do resultado (se há alunas associadas ou não)
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Treinos por aluna (o)</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Pesquisar fichas..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando fichas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { borderColor: colors.primary }]}
            onPress={fetchFichas}
          >
            <Text style={[styles.retryButtonText, { color: colors.primary }]}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : fichas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Você ainda não criou nenhuma ficha de treino.
          </Text>
          <TouchableOpacity 
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.emptyButtonText}>Criar Ficha</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={fichas.filter(ficha => 
            ficha.nome_ficha.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ficha.descricao && ficha.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
          )}
          renderItem={renderFichaItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.fichasList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha cadastrada'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity 
                  style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.emptyButtonText}>Criar Nova Ficha</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Modal para adicionar nova ficha */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Ficha de Treino</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Nome da Ficha *"
              placeholderTextColor={colors.textSecondary}
              value={newFicha.nome}
              onChangeText={(text) => setNewFicha(prev => ({ ...prev, nome: text }))}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }, styles.textArea]}
              placeholder="Descrição (opcional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={newFicha.descricao}
              onChangeText={(text) => setNewFicha(prev => ({ ...prev, descricao: text }))}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewFicha({
                    nome: '',
                    descricao: '',
                  });
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddFicha}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para editar ficha */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Ficha de Treino</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Nome da Ficha *"
              placeholderTextColor={colors.textSecondary}
              value={newFicha.nome}
              onChangeText={(text) => setNewFicha(prev => ({ ...prev, nome: text }))}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }, styles.textArea]}
              placeholder="Descrição (opcional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={newFicha.descricao}
              onChangeText={(text) => setNewFicha(prev => ({ ...prev, descricao: text }))}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedFicha(null);
                  setNewFicha({
                    nome: '',
                    descricao: '',
                  });
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleEditFicha}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Atualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para confirmar exclusão */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => {
          setShowDeleteModal(false);
          setSelectedFicha(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar Exclusão</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Tem certeza que deseja excluir a ficha "{selectedFicha?.nome_ficha}"? Esta ação não pode ser desfeita.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedFicha(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleDeleteConfirm}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para gerenciar alunas associadas */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAlunasAssociadasModal}
        onRequestClose={() => {
          setShowAlunasAssociadasModal(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Atenção - Associações Existentes</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Esta ficha está atribuída a {alunasAssociadas.length} aluna(s). 
              Você precisa remover estas associações antes de excluir a ficha.
            </Text>
            
            {loadingAlunas ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.activityIndicator} />
            ) : (
              <View style={styles.alunasAssociadasContainer}>
                <Text style={[styles.alunasAssociadasTitle, { color: colors.text }]}>
                  Opções:
                </Text>
                <View style={styles.optionsContainer}>
                  <TouchableOpacity 
                    style={[styles.optionButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setShowAlunasAssociadasModal(false);
                      // Navegar para a página de detalhes da ficha para gerenciar associações
                      if (selectedFicha) {
                        router.push(`/ficha-details/${selectedFicha.id}`);
                      }
                    }}
                  >
                    <Text style={styles.optionButtonText}>Gerenciar Associações</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.optionButton, { backgroundColor: '#EF4444' }]}
                    onPress={removerAssociacoesEExcluir}
                  >
                    <Text style={styles.optionButtonText}>Remover Tudo e Excluir Ficha</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: 'rgba(96, 96, 96, 0.1)' }]}
                onPress={() => {
                  setShowAlunasAssociadasModal(false);
                  setSelectedFicha(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#606060' }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
  },
  fichasList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  fichaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fichaContent: {
    padding: 16,
  },
  fichaTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fichaIcon: {
    marginRight: 8,
  },
  fichaTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    flex: 1,
  },
  fichaDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  fichaMetaContainer: {
    marginBottom: 16,
  },
  fichaMetaText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  fichaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  actionButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    marginLeft: 4,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  alunasAssociadasContainer: {
    marginVertical: 16,
  },
  alunasAssociadasTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 12,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  optionButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: 'white',
  },
  activityIndicator: {
    marginVertical: 20,
  },
});