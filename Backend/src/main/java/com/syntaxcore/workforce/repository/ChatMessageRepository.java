package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    /** Load direct message history between two users, newest first */
    @Query("SELECT m FROM ChatMessage m WHERE m.channelType = 'DIRECT' " +
           "AND ((m.sender.id = :userId AND m.recipient.id = :otherId) " +
           "OR   (m.sender.id = :otherId AND m.recipient.id = :userId)) " +
           "ORDER BY m.createdAt DESC")
    Page<ChatMessage> findDirectMessages(@Param("userId") UUID userId,
                                          @Param("otherId") UUID otherId,
                                          Pageable pageable);

    /** Channel messages newest first */
    @Query("SELECT m FROM ChatMessage m WHERE m.channelId = :channelId ORDER BY m.createdAt DESC")
    Page<ChatMessage> findByChannelId(@Param("channelId") UUID channelId, Pageable pageable);

    /** Count unread messages for a user (messages where they are recipient and not yet read) */
    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE m.recipient.id = :userId AND m.read = false")
    long countUnreadForUser(@Param("userId") UUID userId);

    /** Mark all messages from a given sender to this recipient as read */
    @Modifying
    @Query("UPDATE ChatMessage m SET m.read = true " +
           "WHERE m.sender.id = :senderId AND m.recipient.id = :recipientId AND m.read = false")
    void markAsReadBySender(@Param("senderId") UUID senderId, @Param("recipientId") UUID recipientId);
}
