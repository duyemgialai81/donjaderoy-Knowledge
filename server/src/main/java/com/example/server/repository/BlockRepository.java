package com.example.server.repository;

import com.example.server.entity.Block;
import com.example.server.entity.BlockId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlockRepository extends JpaRepository<Block, BlockId> {
    List<Block> findByBlockerId(String blockerId);
    boolean existsByBlockerIdAndBlockedId(String blockerId, String blockedId);
}