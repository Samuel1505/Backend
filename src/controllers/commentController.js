import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import Comment from '../database/models/Comment.js';
import Market from '../database/models/Market.js';

/**
 * @desc    Get all comments for a market
 * @route   GET /api/v1/comments/market/:marketId
 * @access  Public
 */
export const getMarketComments = asyncHandler(async (req, res) => {
  const { marketId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Verify market exists
  const market = await Market.findById(marketId);
  if (!market) {
    throw new NotFoundError(`Market ${marketId} not found`);
  }

  const result = await Comment.findByMarketId(marketId, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  sendPaginated(
    res,
    result.comments,
    result.page,
    result.limit,
    result.total,
    'Comments retrieved successfully'
  );
});

/**
 * @desc    Create a new comment
 * @route   POST /api/v1/comments
 * @access  Public
 */
export const createComment = asyncHandler(async (req, res) => {
  const { marketId, author, content, parentId } = req.body;

  // Validation
  if (!marketId || !author || !content) {
    throw new ValidationError('Market ID, author, and content are required');
  }

  const { config } = await import('../config/index.js');
  const minLength = config.social.comment.minLength;
  const maxLength = config.social.comment.maxLength;

  if (content.length < minLength || content.length > maxLength) {
    throw new ValidationError(`Comment must be between ${minLength} and ${maxLength} characters`);
  }

  // Verify market exists
  const market = await Market.findById(marketId);
  if (!market) {
    throw new NotFoundError(`Market ${marketId} not found`);
  }

  // Verify parent comment exists if provided
  if (parentId) {
    const parent = await Comment.findById(parentId);
    if (!parent) {
      throw new NotFoundError(`Parent comment ${parentId} not found`);
    }
  }

  const comment = await Comment.create({
    marketId,
    author,
    content,
    parentId,
  });

  sendSuccess(res, comment, 'Comment created successfully', 201);
});

/**
 * @desc    Delete a comment
 * @route   DELETE /api/v1/comments/:commentId
 * @access  Public
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { author } = req.body;

  if (!author) {
    throw new ValidationError('Author address is required');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new NotFoundError(`Comment ${commentId} not found`);
  }

  if (comment.author !== author) {
    throw new ValidationError('You can only delete your own comments');
  }

  await Comment.delete(commentId, author);

  sendSuccess(res, { commentId }, 'Comment deleted successfully');
});

